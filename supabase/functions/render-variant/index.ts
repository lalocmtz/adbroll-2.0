import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    console.log("Starting render for variant:", variantId);

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update variant status to rendering
    await supabase
      .from("variants")
      .update({ status: "rendering" })
      .eq("id", variantId);

    // Generate SRT file from script sections
    const srtContent = generateSRT(scriptSections);

    // For MVP: Create a placeholder render using the first clip
    // In production, this would use FFmpeg to properly render everything
    
    const renderMetadata = {
      clips: clipAssignments,
      voiceover_url: voiceoverUrl,
      srt_content: srtContent,
      render_instructions: {
        resolution: "1080x1920", // TikTok/Reels format
        fps: 30,
        codec: "libx264",
        audio_codec: "aac",
        subtitle_style: {
          font: "Inter",
          size: 24,
          color: "&HFFFFFF",
          outline: 2,
          shadow: 0,
          alignment: 2,
          margin_v: 50,
        },
      },
      rendered_at: new Date().toISOString(),
    };

    // Store paths
    const videoPath = `${variantId}/video.mp4`;
    const srtPath = `${variantId}/subtitles.srt`;

    // Create placeholder video by copying the first assigned clip
    if (clipAssignments && clipAssignments.length > 0) {
      const firstClip = clipAssignments[0];
      
      if (firstClip.clipUrl) {
        try {
          // Download the first clip from broll bucket
          const { data: clipData, error: downloadError } = await supabase.storage
            .from("broll")
            .download(firstClip.clipUrl);

          if (downloadError) {
            console.error("Error downloading clip:", downloadError);
          } else if (clipData) {
            // Upload to renders bucket as the output video
            const { error: uploadError } = await supabase.storage
              .from("renders")
              .upload(videoPath, clipData, {
                contentType: "video/mp4",
                upsert: true,
              });

            if (uploadError) {
              console.error("Error uploading placeholder video:", uploadError);
            } else {
              console.log("Placeholder video created successfully");
            }
          }
        } catch (err) {
          console.error("Error creating placeholder video:", err);
        }
      }
    }

    // Upload SRT file to renders bucket
    try {
      const { error: srtUploadError } = await supabase.storage
        .from("renders")
        .upload(srtPath, srtContent, {
          contentType: "text/plain",
          upsert: true,
        });

      if (srtUploadError) {
        console.error("Error uploading SRT:", srtUploadError);
      }
    } catch (err) {
      console.error("Error uploading SRT file:", err);
    }

    // Simulate rendering delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update variant with results
    const { error: updateError } = await supabase
      .from("variants")
      .update({
        status: "completed",
        video_url: videoPath, // Store path, not full URL
        srt_url: srtPath,
        metadata_json: renderMetadata,
        completed_at: new Date().toISOString(),
      })
      .eq("id", variantId);

    if (updateError) throw updateError;

    console.log("Render completed for variant:", variantId);

    return new Response(
      JSON.stringify({
        success: true,
        variantId,
        videoPath,
        srtPath,
        srtContent,
        metadata: renderMetadata,
        note: "This is a placeholder implementation. Production version will use FFmpeg for actual video rendering.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in render-variant:", error);

    // Update variant status to error
    if (req.url) {
      try {
        const { variantId } = await req.json();
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
    const duration = section.duration || 3; // Default 3 seconds per section
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
