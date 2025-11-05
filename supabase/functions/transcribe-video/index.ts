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
  brand_id: string; // Required to create analysis record
  analysis_id?: string; // Optional: if already created
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_url, video_file_path, brand_id, analysis_id }: TranscribeRequest = await req.json();
    
    console.log(`🎙️ [TRANSCRIBE] Starting transcription for brand: ${brand_id}`);

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

    // Create or use existing analysis record
    let currentAnalysisId: string;
    
    if (analysis_id) {
      // Use provided analysis_id
      currentAnalysisId = analysis_id;
      console.log(`📝 [TRANSCRIBE] Using existing analysis: ${currentAnalysisId}`);
    } else {
      // Create new analysis record
      const { data: newAnalysis, error: createError } = await supabaseClient
        .from('video_analyses')
        .insert({
          user_id: user.id,
          brand_id: brand_id,
          source_url: video_url || '',
          video_file_path: video_file_path || null,
          status: 'transcribing',
        })
        .select()
        .single();

      if (createError) throw createError;
      
      currentAnalysisId = newAnalysis.id;
      console.log(`📝 [TRANSCRIBE] Created new analysis: ${currentAnalysisId}`);
    }

    // Determine video source
    let audioUrl: string;
    let videoBlob: Blob;
    
    if (video_file_path) {
      // Generate signed URL for uploaded file
      const { data: signedData, error: signError } = await supabaseClient.storage
        .from('uploaded-videos')
        .createSignedUrl(video_file_path, 3600);
      
      if (signError || !signedData) {
        throw new Error('Error al generar URL firmada del video');
      }
      audioUrl = signedData.signedUrl;
      
      console.log(`🔗 [TRANSCRIBE] Using uploaded file: ${video_file_path}`);
    } else if (video_url) {
      // For social media URLs, we need to download and store first
      console.log(`🔗 [TRANSCRIBE] Downloading from URL: ${video_url.substring(0, 50)}...`);
      
      // Note: TikTok/Instagram URLs don't allow direct downloads
      // We need to use a downloader service or require file upload
      throw new Error('Las URLs de redes sociales requieren descargar el video primero. Por favor, descarga el video y súbelo directamente.');
    } else {
      throw new Error('Se requiere video_url o video_file_path');
    }

    console.log(`🔗 [TRANSCRIBE] Fetching video from storage...`);

    // Fetch video file
    const videoResponse = await fetch(audioUrl);
    if (!videoResponse.ok) {
      throw new Error(`Error al descargar video: ${videoResponse.status}`);
    }
    
    videoBlob = await videoResponse.blob();
    console.log(`📦 [TRANSCRIBE] Video blob size: ${videoBlob.size} bytes`);
    // Call OpenAI Whisper API
    const formData = new FormData();
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
        .eq('id', currentAnalysisId);

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
        status: 'transcribed',
        metadata: {
          whisper_segments: transcriptionData.segments || [],
          duration: transcriptionData.duration,
          language: transcriptionData.language || 'es'
        }
      })
      .eq('id', currentAnalysisId);

    if (updateError) {
      throw new Error(`Error al actualizar análisis: ${updateError.message}`);
    }

    console.log(`💾 [TRANSCRIBE] Transcription saved to database`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: currentAnalysisId,
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