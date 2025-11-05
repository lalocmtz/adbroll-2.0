import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY");
const SHOTSTACK_API_URL = "https://api.shotstack.io/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { variantId, clipAssignments, voiceoverUrl, scriptSections } =
      await req.json();

    if (!variantId || !clipAssignments || !scriptSections) {
      throw new Error(
        "variantId, clipAssignments, and scriptSections are required"
      );
    }

    if (!SHOTSTACK_API_KEY) {
      throw new Error("SHOTSTACK_API_KEY is not configured");
    }

    console.log("Starting Shotstack render for variant:", variantId);

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Helper function to update progress
    const updateProgress = async (status: string, progress: number, message: string) => {
      await supabase
        .from("variants")
        .update({
          status: status as any,
          metadata_json: {
            progress_percent: progress,
            progress_message: message,
            updated_at: new Date().toISOString(),
          },
        })
        .eq("id", variantId);
      console.log(`Progress: ${progress}% - ${message}`);
    };

    // Update variant status to rendering
    await updateProgress("rendering", 0, "Iniciando renderizado...");

    // Generate SRT content
    const srtContent = generateSRT(scriptSections);

    // Step 1: Get signed URLs for all clips
    await updateProgress("rendering", 10, "Obteniendo URLs de clips...");
    console.log("Getting signed URLs for clips...");
    const clipUrls: string[] = [];
    
    for (const clip of clipAssignments) {
      if (!clip.clipUrl) continue;

      const { data: signedData, error: signError } = await supabase.storage
        .from("broll")
        .createSignedUrl(clip.clipUrl, 3600); // 1 hour validity

      if (!signError && signedData?.signedUrl) {
        clipUrls.push(signedData.signedUrl);
        console.log("Got signed URL for clip:", clip.clipUrl);
      }
    }

    if (clipUrls.length === 0) {
      throw new Error("No valid clip URLs found");
    }

    // Step 2: Build Shotstack timeline
    await updateProgress("rendering", 20, "Construyendo timeline de video...");
    console.log("Building Shotstack timeline...");
    
    // Create video clips for timeline
    const videoClips = clipUrls.map((url, index) => {
      const section = clipAssignments[index];
      const duration = section?.duration || 3;

      return {
        asset: {
          type: "video",
          src: url,
          trim: duration, // Trim to expected duration
        },
        start: index === 0 ? 0 : clipAssignments
          .slice(0, index)
          .reduce((sum: number, s: any) => sum + (s.duration || 3), 0),
        length: duration,
      };
    });

    // Add voiceover track if available
    const tracks: any[] = [
      {
        clips: videoClips,
      },
    ];

    if (voiceoverUrl) {
      console.log("Adding voiceover track...");
      tracks.push({
        clips: [
          {
            asset: {
              type: "audio",
              src: voiceoverUrl,
            },
            start: 0,
            length: videoClips.reduce((sum, clip) => sum + clip.length, 0),
          },
        ],
      });
    }

    // Add subtitle track
    console.log("Adding subtitles...");
    const subtitleClips = scriptSections.map((section: any, index: number) => {
      const startTime = index === 0 ? 0 : scriptSections
        .slice(0, index)
        .reduce((sum: number, s: any) => sum + (s.duration || 3), 0);

      return {
        asset: {
          type: "title",
          text: section.text,
          style: "minimal",
          color: "#ffffff",
          size: "medium",
          background: "#000000",
          position: "bottom",
        },
        start: startTime,
        length: section.duration || 3,
      };
    });

    tracks.push({
      clips: subtitleClips,
    });

    // Build final Shotstack edit
    const shotstackEdit = {
      timeline: {
        background: "#000000",
        tracks: tracks,
      },
      output: {
        format: "mp4",
        resolution: "hd",
        aspectRatio: "9:16", // Vertical for TikTok/Reels
        size: {
          width: 1080,
          height: 1920,
        },
        fps: 30,
        scaleTo: "crop",
      },
    };

    console.log("Shotstack edit payload:", JSON.stringify(shotstackEdit, null, 2));

    // Step 3: Submit render to Shotstack
    await updateProgress("rendering", 30, "Enviando a Shotstack...");
    console.log("Submitting render to Shotstack...");
    const renderResponse = await fetch(`${SHOTSTACK_API_URL}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SHOTSTACK_API_KEY,
      },
      body: JSON.stringify(shotstackEdit),
    });

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      console.error("Shotstack API error:", errorText);
      throw new Error(`Shotstack API error: ${errorText}`);
    }

    const renderData = await renderResponse.json();
    console.log("Shotstack render submitted:", renderData);

    const renderId = renderData.response?.id;
    if (!renderId) {
      throw new Error("No render ID received from Shotstack");
    }

    // Step 4: Poll for render completion
    await updateProgress("rendering", 40, "Procesando video en Shotstack...");
    console.log("Polling for render completion...");
    let renderStatus = "queued";
    let renderUrl = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5s intervals)

    while (renderStatus !== "done" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      // Update progress based on attempts (40% to 70% range)
      const progressPercent = 40 + Math.min(30, Math.floor((attempts / maxAttempts) * 30));
      await updateProgress("rendering", progressPercent, `Renderizando video (${attempts + 1}/${maxAttempts})...`);

      const statusResponse = await fetch(
        `${SHOTSTACK_API_URL}/render/${renderId}`,
        {
          headers: {
            "x-api-key": SHOTSTACK_API_KEY,
          },
        }
      );

      if (!statusResponse.ok) {
        console.error("Error checking render status");
        break;
      }

      const statusData = await statusResponse.json();
      renderStatus = statusData.response?.status;
      renderUrl = statusData.response?.url;

      console.log(`Render status: ${renderStatus} (attempt ${attempts + 1}/${maxAttempts})`);

      if (renderStatus === "failed") {
        throw new Error("Shotstack render failed");
      }

      attempts++;
    }

    if (renderStatus !== "done" || !renderUrl) {
      throw new Error("Render timeout or failed to complete");
    }

    await updateProgress("rendering", 75, "Descargando video renderizado...");
    console.log("Render completed, downloading from:", renderUrl);

    // Step 5: Download rendered video from Shotstack
    const videoResponse = await fetch(renderUrl);
    if (!videoResponse.ok) {
      throw new Error("Failed to download rendered video");
    }

    const videoBlob = await videoResponse.arrayBuffer();
    console.log("Video downloaded, size:", videoBlob.byteLength);

    // Step 6: Upload to Supabase storage
    await updateProgress("rendering", 85, "Subiendo a Supabase Storage...");
    const videoPath = `${variantId}/video.mp4`;
    const srtPath = `${variantId}/subtitles.srt`;

    console.log("Uploading to Supabase storage...");
    
    const { error: videoUploadError } = await supabase.storage
      .from("renders")
      .upload(videoPath, videoBlob, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (videoUploadError) {
      console.error("Error uploading video:", videoUploadError);
      throw videoUploadError;
    }

    // Upload SRT file
    const { error: srtUploadError } = await supabase.storage
      .from("renders")
      .upload(srtPath, srtContent, {
        contentType: "text/plain",
        upsert: true,
      });

    if (srtUploadError) {
      console.error("Error uploading SRT:", srtUploadError);
    }

    // Step 7: Update variant status
    await updateProgress("rendering", 95, "Finalizando...");
    
    const renderMetadata = {
      shotstack_render_id: renderId,
      clips_count: clipUrls.length,
      has_voiceover: !!voiceoverUrl,
      has_subtitles: true,
      resolution: "1080x1920",
      fps: 30,
      rendered_with: "Shotstack API",
      rendered_at: new Date().toISOString(),
      progress_percent: 100,
      progress_message: "Completado",
    };

    const { error: updateError } = await supabase
      .from("variants")
      .update({
        status: "completed",
        video_url: videoPath,
        srt_url: srtPath,
        metadata_json: renderMetadata,
        completed_at: new Date().toISOString(),
      })
      .eq("id", variantId);

    if (updateError) throw updateError;

    console.log("Render completed successfully for variant:", variantId);

    return new Response(
      JSON.stringify({
        success: true,
        variantId,
        videoPath,
        srtPath,
        shotstackRenderId: renderId,
        metadata: renderMetadata,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in render-variant:", error);

    // Update variant status to error
    try {
      const body = await req.clone().json();
      const { variantId } = body;

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabase
        .from("variants")
        .update({
          status: "failed",
          error_message: (error as Error).message,
        })
        .eq("id", variantId);
    } catch (e) {
      console.error("Failed to update variant error status:", e);
    }

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateSRT(sections: any[]): string {
  let srt = "";
  let index = 1;
  let currentTime = 0;

  for (const section of sections) {
    const duration = section.duration || 3;
    const startTime = formatSRTTime(currentTime);
    const endTime = formatSRTTime(currentTime + duration);

    srt += `${index}\n`;
    srt += `${startTime} --> ${endTime}\n`;
    srt += `${section.text}\n\n`;

    index++;
    currentTime += duration;
  }

  return srt;
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}

function pad(num: number, size: number = 2): string {
  let s = num.toString();
  while (s.length < size) s = "0" + s;
  return s;
}
