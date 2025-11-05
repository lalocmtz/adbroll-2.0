import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscribeRequest {
  video_url?: string;
  video_file_path?: string;
  analysis_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_url, video_file_path, analysis_id }: TranscribeRequest = await req.json();
    
    console.log(`🎙️ [TRANSCRIBE] Starting transcription for analysis: ${analysis_id}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no configurada');
    }

    // Determine video source
    let audioUrl: string;
    if (video_file_path) {
      // Generate signed URL for uploaded file
      const { data: signedData, error: signError } = await supabaseClient.storage
        .from('uploaded-videos')
        .createSignedUrl(video_file_path, 3600);
      
      if (signError || !signedData) {
        throw new Error('Error al generar URL firmada del video');
      }
      audioUrl = signedData.signedUrl;
    } else if (video_url) {
      audioUrl = video_url;
    } else {
      throw new Error('Se requiere video_url o video_file_path');
    }

    console.log(`🔗 [TRANSCRIBE] Audio URL: ${audioUrl.substring(0, 50)}...`);

    // Call OpenAI Whisper API
    const formData = new FormData();
    
    // Fetch video file
    const videoResponse = await fetch(audioUrl);
    if (!videoResponse.ok) {
      throw new Error(`Error al descargar video: ${videoResponse.status}`);
    }
    
    const videoBlob = await videoResponse.blob();
    formData.append('file', videoBlob, 'video.mp4');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json'); // Include timestamps
    formData.append('language', 'es'); // Spanish audio

    console.log(`📤 [TRANSCRIBE] Calling Whisper API...`);

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error(`❌ [TRANSCRIBE] Whisper API error: ${errorText}`);
      throw new Error(`Error en Whisper API: ${whisperResponse.status}`);
    }

    const transcriptionData = await whisperResponse.json();
    console.log(`✅ [TRANSCRIBE] Transcription completed: ${transcriptionData.text?.length || 0} chars`);

    // Validate transcription quality
    if (!transcriptionData.text || transcriptionData.text.trim().length < 50) {
      console.warn(`⚠️ [TRANSCRIBE] Insufficient audio content`);
      
      // Update analysis with error
      await supabaseClient
        .from('video_analyses')
        .update({
          status: 'failed',
          error_message: 'El video no contiene suficiente audio claro para transcribir. Intenta con un video que tenga voiceover o diálogo.',
        })
        .eq('id', analysis_id);

      return new Response(
        JSON.stringify({
          error: 'INSUFFICIENT_AUDIO',
          message: 'El video no contiene suficiente audio claro para transcribir',
          suggestion: 'Intenta con un video que tenga voiceover o diálogo claro'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update video_analyses with transcription
    const { error: updateError } = await supabaseClient
      .from('video_analyses')
      .update({
        transcription: transcriptionData.text,
        metadata: {
          whisper_segments: transcriptionData.segments || [],
          duration: transcriptionData.duration,
          language: transcriptionData.language || 'es'
        }
      })
      .eq('id', analysis_id);

    if (updateError) {
      throw new Error(`Error al actualizar análisis: ${updateError.message}`);
    }

    console.log(`💾 [TRANSCRIBE] Transcription saved to database`);

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcriptionData.text,
        duration: transcriptionData.duration,
        segments_count: transcriptionData.segments?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ [TRANSCRIBE] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error al transcribir video',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});