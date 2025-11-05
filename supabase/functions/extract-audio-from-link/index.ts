import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractRequest {
  video_url: string;
  brand_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_url, brand_id }: ExtractRequest = await req.json();

    if (!video_url || !brand_id) {
      throw new Error("video_url and brand_id are required");
    }

    console.log("[EXTRACT] Starting extraction for URL:", video_url);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Create initial analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from("video_analyses")
      .insert({
        user_id: user.id,
        brand_id: brand_id,
        source_url: video_url,
        status: "processing",
      })
      .select()
      .single();

    if (analysisError) throw analysisError;

    console.log("[EXTRACT] Analysis record created:", analysis.id);

    // Extract video info based on platform
    let videoData: { audioUrl: string; thumbnailUrl: string };
    
    try {
      console.log("[EXTRACT] Detecting platform and extracting video info...");
      videoData = await extractVideoData(video_url);
    } catch (error: any) {
      console.error("[EXTRACT] Error extracting video data:", error);
      
      // Update analysis status to failed
      await supabase
        .from("video_analyses")
        .update({
          status: "failed",
          error_message: error.message || "Unknown error during extraction",
        })
        .eq("id", analysis.id);
      
      throw error;
    }

    // Download audio file
    console.log("[EXTRACT] Downloading audio from:", videoData.audioUrl);
    let audioBlob: Blob;
    
    try {
      const audioResponse = await fetch(videoData.audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Error downloading audio: ${audioResponse.status} ${audioResponse.statusText}`);
      }
      audioBlob = await audioResponse.blob();
      console.log("[EXTRACT] Audio downloaded, size:", audioBlob.size, "bytes");
    } catch (error) {
      console.error("[EXTRACT] Error downloading audio:", error);
      throw new Error("No se pudo descargar el audio del video");
    }

    // Transcribe with Whisper
    console.log("[EXTRACT] Transcribing with Whisper...");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured. Please add it in Supabase secrets.");
    }

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.mp3");
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error("[EXTRACT] Whisper error:", errorText);
      throw new Error(`Error en transcripción: ${whisperResponse.status}`);
    }

    const whisperData = await whisperResponse.json();
    const transcription = whisperData.text;

    console.log("[EXTRACT] Transcription completed, length:", transcription.length);

    // Update analysis with transcription and thumbnail
    const { error: updateError } = await supabase
      .from("video_analyses")
      .update({
        transcription: transcription,
        thumbnail_url: videoData.thumbnailUrl,
        status: "transcribed",
        metadata: {
          extracted_at: new Date().toISOString(),
          duration: whisperData.duration,
          segments_count: whisperData.segments?.length || 0,
          language: whisperData.language,
        },
      })
      .eq("id", analysis.id);

    if (updateError) throw updateError;

    console.log("[EXTRACT] Extraction completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: analysis.id,
        transcription,
        thumbnail_url: videoData.thumbnailUrl,
        duration: whisperData.duration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[EXTRACT] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Extract video data (audio URL + thumbnail) using Download All in One API
 * Supports: TikTok, YouTube, Instagram, Facebook, Threads, Vimeo, Reddit, and more
 */
async function extractVideoData(url: string): Promise<{ audioUrl: string; thumbnailUrl: string }> {
  const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
  
  if (!RAPIDAPI_KEY) {
    throw new Error(
      "Para extraer videos automáticamente, necesitas configurar RAPIDAPI_KEY. " +
      "Ve a la configuración del proyecto para agregarlo."
    );
  }

  try {
    console.log("[EXTRACT] Fetching video info from Social Download All In One API...");
    
    const response = await fetch(
      "https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "social-download-all-in-one.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
        body: JSON.stringify({ url }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[EXTRACT] RapidAPI error:", response.status, errorText);
      
      if (response.status === 403) {
        throw new Error(
          "Debes suscribirte a la API 'Social Download All In One' en RapidAPI. " +
          "Ve a https://rapidapi.com/hub y busca 'Social Download All In One' para activar tu suscripción."
        );
      }
      
      throw new Error(`Error al extraer el video: ${response.status}`);
    }

    const data = await response.json();
    console.log("[EXTRACT] API Response:", JSON.stringify(data, null, 2));
    
    // The API may return data in different structures, let's check all possibilities
    const medias = data.medias || [];
    const audioUrl = data.audio_url || 
                     data.video_url || 
                     data.url ||
                     (medias[0]?.url) ||
                     (medias[0]?.video_url);
    
    const thumbnailUrl = data.thumbnail_url || 
                         data.thumbnail || 
                         data.cover ||
                         data.picture ||
                         (medias[0]?.thumbnail);
    
    console.log("[EXTRACT] Extracted audioUrl:", audioUrl);
    console.log("[EXTRACT] Extracted thumbnailUrl:", thumbnailUrl);
    
    if (!audioUrl) {
      throw new Error("No se pudo obtener el audio/video del enlace proporcionado. Respuesta de API: " + JSON.stringify(data));
    }

    return {
      audioUrl,
      thumbnailUrl: thumbnailUrl || "",
    };
  } catch (error: any) {
    console.error("[EXTRACT] Error:", error);
    throw new Error(
      error.message || "No se pudo extraer el video. Verifica que el enlace sea válido."
    );
  }
}

