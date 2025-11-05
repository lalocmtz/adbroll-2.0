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
 * Extract video data (audio URL + thumbnail) from different platforms
 */
async function extractVideoData(url: string): Promise<{ audioUrl: string; thumbnailUrl: string }> {
  // TikTok
  if (url.includes("tiktok.com")) {
    return await extractTikTokData(url);
  }

  // Instagram
  if (url.includes("instagram.com")) {
    return await extractInstagramData(url);
  }

  // YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return await extractYouTubeData(url);
  }

  // Facebook
  if (url.includes("facebook.com") || url.includes("fb.watch")) {
    return await extractFacebookData(url);
  }

  throw new Error(
    "Plataforma no soportada. Actualmente soportamos: YouTube, TikTok, Instagram y Facebook."
  );
}

/**
 * Extract TikTok video data using RapidAPI TikTok Downloader
 * Requires RAPIDAPI_KEY secret to be set
 */
async function extractTikTokData(url: string): Promise<{ audioUrl: string; thumbnailUrl: string }> {
  const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
  
  if (!RAPIDAPI_KEY) {
    throw new Error(
      "Para extraer videos de TikTok automáticamente, necesitas configurar RAPIDAPI_KEY. " +
      "Alternativa: descarga el video manualmente usando SnapTik (snaptik.app) y súbelo."
    );
  }

  try {
    console.log("[TIKTOK] Fetching video data from RapidAPI...");
    
    const response = await fetch(
      `https://tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com/vid/index?url=${encodeURIComponent(url)}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": "tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      audioUrl: data.music || data.video[0],
      thumbnailUrl: data.cover || data.origin_cover,
    };
  } catch (error) {
    console.error("[TIKTOK] Error:", error);
    throw new Error(
      "No se pudo extraer el video de TikTok. Descarga el video manualmente usando SnapTik (snaptik.app) y súbelo."
    );
  }
}

/**
 * Extract Instagram video data using RapidAPI
 */
async function extractInstagramData(url: string): Promise<{ audioUrl: string; thumbnailUrl: string }> {
  const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
  
  if (!RAPIDAPI_KEY) {
    throw new Error(
      "Para extraer videos de Instagram automáticamente, necesitas configurar RAPIDAPI_KEY. " +
      "Alternativa: descarga el video manualmente y súbelo."
    );
  }

  try {
    console.log("[INSTAGRAM] Fetching video data from RapidAPI...");
    
    const response = await fetch(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(url)}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": "instagram-scraper-api2.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status}`);
    }

    const data = await response.json();
    const videoData = data.data?.video_url || data.data?.carousel_media?.[0]?.video_url;
    
    if (!videoData) {
      throw new Error("No se encontró video en este post de Instagram");
    }

    return {
      audioUrl: videoData,
      thumbnailUrl: data.data?.thumbnail_url || data.data?.display_url,
    };
  } catch (error) {
    console.error("[INSTAGRAM] Error:", error);
    throw new Error(
      "No se pudo extraer el video de Instagram. Descarga el video manualmente y súbelo."
    );
  }
}

/**
 * Extract YouTube video data
 * Note: For audio extraction, you'd need a service that provides direct audio URLs
 */
async function extractYouTubeData(url: string): Promise<{ audioUrl: string; thumbnailUrl: string }> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error("URL de YouTube inválida");
  }

  try {
    // Get thumbnail
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // For audio extraction from YouTube, you'd need:
    // 1. A YouTube API key to get video info
    // 2. A service that provides direct audio stream URLs (like invidious or similar)
    // 3. Or use RapidAPI's YouTube downloader
    
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    
    if (!RAPIDAPI_KEY) {
      throw new Error(
        "Para extraer audio de YouTube, necesitas configurar RAPIDAPI_KEY. " +
        "Alternativa: descarga el video manualmente usando yt-dlp o similar."
      );
    }

    console.log("[YOUTUBE] Fetching video data from RapidAPI...");
    
    const response = await fetch(
      `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": "youtube-mp36.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== "ok" || !data.link) {
      throw new Error("No se pudo obtener el audio del video de YouTube");
    }

    return {
      audioUrl: data.link,
      thumbnailUrl: thumbnailUrl,
    };
  } catch (error) {
    console.error("[YOUTUBE] Error:", error);
    throw new Error(
      "No se pudo extraer el video de YouTube. Descarga el video manualmente."
    );
  }
}

/**
 * Extract Facebook video data
 */
async function extractFacebookData(url: string): Promise<{ audioUrl: string; thumbnailUrl: string }> {
  throw new Error(
    "La extracción automática de Facebook aún no está implementada. " +
    "Descarga el video manualmente y súbelo."
  );
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/,
    /(?:youtube\.com\/shorts\/)([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
