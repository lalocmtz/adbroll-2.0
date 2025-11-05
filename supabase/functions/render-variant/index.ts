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
  console.log("🔵🔵🔵 [RENDER-VARIANT] ===== EDGE FUNCTION INVOKED =====");
  console.log("🔵 [RENDER-VARIANT] Request method:", req.method);
  console.log("🔵 [RENDER-VARIANT] Request URL:", req.url);
  
  if (req.method === "OPTIONS") {
    console.log("⚙️ [RENDER-VARIANT] Handling OPTIONS (CORS preflight)");
    return new Response("ok", { headers: corsHeaders });
  }

  let variantId: string | null = null; // Capture early for error handling

  try {
    console.log("📥 [RENDER-VARIANT] Parsing request body...");
    const body = await req.json();
    console.log("✅ [RENDER-VARIANT] Body parsed successfully");
    const { variantId: vId, clipAssignments, voiceoverUrl, scriptSections } = body;
    variantId = vId; // Store for error handling

    console.log("🚀 [RENDER-VARIANT] Request received for variant:", variantId);
    console.log("📦 [RENDER-VARIANT] Clips count:", clipAssignments?.length);
    console.log("🎤 [RENDER-VARIANT] Has voiceover:", !!voiceoverUrl);
    console.log("📝 [RENDER-VARIANT] Script sections:", scriptSections?.length);

    if (!variantId || !clipAssignments || !scriptSections) {
      throw new Error(
        "variantId, clipAssignments, and scriptSections are required"
      );
    }

    if (!SHOTSTACK_API_KEY) {
      throw new Error("SHOTSTACK_API_KEY is not configured");
    }

    console.log("✅ [RENDER-VARIANT] Starting Shotstack render for variant:", variantId);

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Helper function to update progress with error checking
    const updateProgress = async (status: string, progress: number, message: string) => {
      console.log(`⏳ [RENDER-VARIANT] Updating progress: ${progress}% - ${message}`);
      
      const { data, error } = await supabase
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

      if (error) {
        console.error(`❌ [RENDER-VARIANT] Failed to update progress:`, error);
        throw new Error(`Failed to update progress: ${error.message}`);
      }
      
      console.log(`✅ [RENDER-VARIANT] Progress updated successfully: ${progress}% - ${message}`);
      return data;
    };

    // Update variant status to rendering
    console.log("📊 [RENDER-VARIANT] Step 1: Initializing render...");
    await updateProgress("rendering", 0, "Iniciando renderizado...");

    // Generate SRT content
    const srtContent = generateSRT(scriptSections);
    console.log("📄 [RENDER-VARIANT] SRT content generated, length:", srtContent.length);

    // Step 1: Get signed URLs for all clips
    console.log("🔗 [RENDER-VARIANT] Step 2: Getting signed URLs...");
    await updateProgress("rendering", 10, "Obteniendo URLs de clips...");
    const clipUrls: string[] = [];
    
    for (let i = 0; i < clipAssignments.length; i++) {
      const clip = clipAssignments[i];
      if (!clip.clipUrl) {
        console.warn(`⚠️ [RENDER-VARIANT] Clip ${i} has no clipUrl, skipping`);
        continue;
      }

      console.log(`🔗 [RENDER-VARIANT] Getting signed URL for clip ${i}:`, clip.clipUrl);
      
      const { data: signedData, error: signError } = await supabase.storage
        .from("broll")
        .createSignedUrl(clip.clipUrl, 3600); // 1 hour validity

      if (signError) {
        console.error(`❌ [RENDER-VARIANT] Error getting signed URL for clip ${i}:`, signError);
        continue;
      }

      if (signedData?.signedUrl) {
        clipUrls.push(signedData.signedUrl);
        console.log(`✅ [RENDER-VARIANT] Got signed URL for clip ${i}`);
      }
    }

    console.log(`📊 [RENDER-VARIANT] Total signed URLs obtained: ${clipUrls.length} / ${clipAssignments.length}`);

    if (clipUrls.length === 0) {
      throw new Error("No valid clip URLs found");
    }

    // Step 2: Build Shotstack timeline
    console.log("🎬 [RENDER-VARIANT] Step 3: Building Shotstack timeline...");
    await updateProgress("rendering", 20, "Construyendo timeline de video...");
    console.log("🎬 [RENDER-VARIANT] Creating video clips from signed URLs...");
    
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
      console.log("🎤 [RENDER-VARIANT] Adding voiceover track with URL:", voiceoverUrl.substring(0, 50) + "...");
      const totalLength = videoClips.reduce((sum, clip) => sum + clip.length, 0);
      console.log(`🎤 [RENDER-VARIANT] Voiceover length will be: ${totalLength}s`);
      
      tracks.push({
        clips: [
          {
            asset: {
              type: "audio",
              src: voiceoverUrl,
            },
            start: 0,
            length: totalLength,
          },
        ],
      });
    }

    // Add subtitle track
    console.log("📝 [RENDER-VARIANT] Adding subtitles track...");
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
        aspectRatio: "9:16", // Vertical for TikTok/Reels
        size: {
          width: 1080,
          height: 1920,
        },
        fps: 30,
      },
    };

    console.log("📦 [RENDER-VARIANT] Shotstack edit payload:", JSON.stringify(shotstackEdit, null, 2));

    // Step 3: Submit render to Shotstack
    console.log("🚀 [RENDER-VARIANT] Step 4: Submitting to Shotstack API...");
    await updateProgress("rendering", 30, "Enviando a Shotstack...");
    
    const renderResponse = await fetch(`${SHOTSTACK_API_URL}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SHOTSTACK_API_KEY,
      },
      body: JSON.stringify(shotstackEdit),
    });

    console.log(`📡 [RENDER-VARIANT] Shotstack response status: ${renderResponse.status}`);

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      console.error("❌ [RENDER-VARIANT] Shotstack API error:", errorText);
      throw new Error(`Shotstack API error: ${errorText}`);
    }

    const renderData = await renderResponse.json();
    console.log("✅ [RENDER-VARIANT] Shotstack render submitted successfully:", renderData);

    const renderId = renderData.response?.id;
    if (!renderId) {
      console.error("❌ [RENDER-VARIANT] No render ID in response:", renderData);
      throw new Error("No render ID received from Shotstack");
    }

    console.log(`🎯 [RENDER-VARIANT] Render ID obtained: ${renderId}`);

    // Step 4: Poll for render completion
    console.log("⏱️ [RENDER-VARIANT] Step 5: Starting polling for render completion...");
    await updateProgress("rendering", 40, "Procesando video en Shotstack...");
    
    let renderStatus = "queued";
    let renderUrl = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    const startTime = Date.now();

    while (renderStatus !== "done" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      // Update progress based on attempts (40% to 70% range)
      const progressPercent = 40 + Math.min(30, Math.floor((attempts / maxAttempts) * 30));
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      console.log(`⏱️ [RENDER-VARIANT] Polling attempt ${attempts + 1}/${maxAttempts} (${elapsed}s elapsed)`);
      await updateProgress("rendering", progressPercent, `Renderizando video (${attempts + 1}/${maxAttempts})...`);

      const statusResponse = await fetch(
        `${SHOTSTACK_API_URL}/render/${renderId}`,
        {
          headers: {
            "x-api-key": SHOTSTACK_API_KEY,
          },
        }
      );

      console.log(`📡 [RENDER-VARIANT] Status check response: ${statusResponse.status}`);

      if (!statusResponse.ok) {
        console.error("❌ [RENDER-VARIANT] Error checking render status, response not OK");
        break;
      }

      const statusData = await statusResponse.json();
      renderStatus = statusData.response?.status;
      renderUrl = statusData.response?.url;

      console.log(`📊 [RENDER-VARIANT] Render status: ${renderStatus} (attempt ${attempts + 1}/${maxAttempts})`);
      console.log(`📊 [RENDER-VARIANT] Full status data:`, JSON.stringify(statusData, null, 2));

      if (renderStatus === "failed") {
        console.error("❌ [RENDER-VARIANT] Shotstack render failed:", statusData);
        throw new Error(`Shotstack render failed: ${JSON.stringify(statusData.response)}`);
      }

      attempts++;
    }

    if (renderStatus !== "done" || !renderUrl) {
      console.error(`❌ [RENDER-VARIANT] Render timeout or incomplete. Status: ${renderStatus}, URL: ${renderUrl}`);
      throw new Error(`Render timeout or failed to complete. Final status: ${renderStatus}`);
    }

    console.log(`✅ [RENDER-VARIANT] Render completed successfully! URL: ${renderUrl}`);
    await updateProgress("rendering", 75, "Descargando video renderizado...");

    // Step 5: Download rendered video from Shotstack
    console.log("⬇️ [RENDER-VARIANT] Step 6: Downloading rendered video from:", renderUrl);
    const videoResponse = await fetch(renderUrl);
    
    if (!videoResponse.ok) {
      console.error(`❌ [RENDER-VARIANT] Failed to download video, status: ${videoResponse.status}`);
      throw new Error(`Failed to download rendered video: ${videoResponse.status}`);
    }

    const videoBlob = await videoResponse.arrayBuffer();
    console.log(`✅ [RENDER-VARIANT] Video downloaded successfully, size: ${videoBlob.byteLength} bytes (${(videoBlob.byteLength / 1024 / 1024).toFixed(2)} MB)`);

    // Step 6: Upload to Supabase storage
    console.log("☁️ [RENDER-VARIANT] Step 7: Uploading to Supabase Storage...");
    await updateProgress("rendering", 85, "Subiendo a Supabase Storage...");
    
    // Use consistent path format (without leading slash)
    const videoPath = `${variantId}/video.mp4`;
    const srtPath = `${variantId}/subtitles.srt`;

    console.log(`☁️ [RENDER-VARIANT] Video path: ${videoPath}`);
    console.log(`☁️ [RENDER-VARIANT] SRT path: ${srtPath}`);
    console.log(`☁️ [RENDER-VARIANT] Video size to upload: ${(videoBlob.byteLength / 1024 / 1024).toFixed(2)} MB`);
    
    const { data: uploadData, error: videoUploadError } = await supabase.storage
      .from("renders")
      .upload(videoPath, videoBlob, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadData) {
      console.log(`✅ [RENDER-VARIANT] Upload response:`, uploadData);
    }

    if (videoUploadError) {
      console.error("❌ [RENDER-VARIANT] Error uploading video to storage:", videoUploadError);
      throw videoUploadError;
    }

    console.log("✅ [RENDER-VARIANT] Video uploaded successfully to storage");

    // Upload SRT file
    console.log("📝 [RENDER-VARIANT] Uploading SRT file...");
    const { error: srtUploadError } = await supabase.storage
      .from("renders")
      .upload(srtPath, srtContent, {
        contentType: "application/x-subrip",
        upsert: true,
      });

    if (srtUploadError) {
      console.error("⚠️ [RENDER-VARIANT] Error uploading SRT (non-critical):", srtUploadError);
    } else {
      console.log("✅ [RENDER-VARIANT] SRT uploaded successfully");
    }

    // Step 7: Update variant status
    console.log("🏁 [RENDER-VARIANT] Step 8: Finalizing variant...");
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

    console.log("💾 [RENDER-VARIANT] Updating variant to completed status...");
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

    if (updateError) {
      console.error("❌ [RENDER-VARIANT] Failed to update variant to completed:", updateError);
      throw updateError;
    }

    console.log("🎉 [RENDER-VARIANT] Render completed successfully for variant:", variantId);

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
    console.error("💥 [RENDER-VARIANT] Fatal error in render-variant:", error);
    console.error("💥 [RENDER-VARIANT] Error stack:", (error as Error).stack);

    // Update variant status to error
    if (variantId) {
      try {
        console.log(`❌ [RENDER-VARIANT] Updating variant ${variantId} to failed status...`);
        
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { error: updateError } = await supabase
          .from("variants")
          .update({
            status: "failed",
            error_message: (error as Error).message,
            metadata_json: {
              error_stack: (error as Error).stack,
              failed_at: new Date().toISOString(),
            },
          })
          .eq("id", variantId);

        if (updateError) {
          console.error("❌ [RENDER-VARIANT] Failed to update error status:", updateError);
        } else {
          console.log("✅ [RENDER-VARIANT] Variant marked as failed in database");
        }
      } catch (e) {
        console.error("💥 [RENDER-VARIANT] Critical: Failed to update variant error status:", e);
      }
    } else {
      console.error("⚠️ [RENDER-VARIANT] No variantId available to update error status");
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
