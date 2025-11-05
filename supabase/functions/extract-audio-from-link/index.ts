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

    // Use yt-dlp to get video info and audio URL
    // Note: For production, you'd run yt-dlp as subprocess, but for MVP we'll use a direct approach
    let audioUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    try {
      // For TikTok, Instagram, YouTube, we can use their oEmbed or direct APIs
      // Simplified approach: try to fetch video info
      console.log("[EXTRACT] Fetching video metadata...");

      // Use yt-dlp format (simplified for demonstration)
      // In production, this would call: yt-dlp -j --flat-playlist {{video_url}}
      const videoInfo = await getVideoInfo(video_url);
      
      audioUrl = videoInfo.audioUrl;
      thumbnailUrl = videoInfo.thumbnail;

      console.log("[EXTRACT] Metadata extracted");
    } catch (error) {
      console.error("[EXTRACT] Error fetching metadata:", error);
      throw new Error("No se pudo extraer información del video. Verifica que el link sea válido y público.");
    }

    // Download audio and send to Whisper
    console.log("[EXTRACT] Downloading audio...");
    let audioBlob: Blob;
    
    try {
      const audioResponse = await fetch(audioUrl!);
      if (!audioResponse.ok) {
        throw new Error("Error downloading audio");
      }
      audioBlob = await audioResponse.blob();
    } catch (error) {
      console.error("[EXTRACT] Error downloading audio:", error);
      throw new Error("No se pudo descargar el audio del video");
    }

    // Transcribe with Whisper
    console.log("[EXTRACT] Transcribing with Whisper...");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.mp3");
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("language", "es");

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
      throw new Error("Error en transcripción de audio");
    }

    const whisperData = await whisperResponse.json();
    const transcription = whisperData.text;

    console.log("[EXTRACT] Transcription completed, length:", transcription.length);

    // Update analysis with transcription and thumbnail
    const { error: updateError } = await supabase
      .from("video_analyses")
      .update({
        transcription: transcription,
        thumbnail_url: thumbnailUrl,
        status: "transcribed",
        metadata: {
          extracted_at: new Date().toISOString(),
          duration: whisperData.duration,
          segments_count: whisperData.segments?.length || 0,
        },
      })
      .eq("id", analysis.id);

    if (updateError) throw updateError;

    console.log("[EXTRACT] Extraction completed successfully");

    return new Response(
      JSON.stringify({
        analysis_id: analysis.id,
        transcription,
        thumbnail_url: thumbnailUrl,
        duration: whisperData.duration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[EXTRACT] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to extract video info
// In production, this would use yt-dlp subprocess or proper APIs
async function getVideoInfo(url: string): Promise<{ audioUrl: string; thumbnail: string }> {
  // For TikTok
  if (url.includes("tiktok.com")) {
    // Use TikTok's oEmbed or web scraping
    // For MVP: Return mock data with guidance
    throw new Error(
      "Para videos de TikTok, por favor descarga el video primero usando SnapTik (snaptik.app) y súbelo directamente."
    );
  }

  // For Instagram
  if (url.includes("instagram.com")) {
    throw new Error(
      "Para videos de Instagram, por favor descarga el video primero y súbelo directamente."
    );
  }

  // For YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    // Extract video ID
    const videoId = extractYouTubeId(url);
    if (!videoId) throw new Error("Invalid YouTube URL");

    // Use YouTube's oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      throw new Error("Error fetching YouTube video info");
    }

    const data = await response.json();
    
    return {
      audioUrl: `https://www.youtube.com/watch?v=${videoId}`, // Placeholder - needs proper extraction
      thumbnail: data.thumbnail_url,
    };
  }

  throw new Error("Plataforma no soportada. Soportamos YouTube, TikTok e Instagram.");
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
