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

    // Create temporary directory for processing
    const tempDir = await Deno.makeTempDir();
    console.log("Temp directory created:", tempDir);

    try {
      // Step 1: Download all clips
      console.log("Downloading clips...");
      const clipPaths: string[] = [];
      
      for (let i = 0; i < clipAssignments.length; i++) {
        const clip = clipAssignments[i];
        if (!clip.clipUrl) {
          console.warn(`Clip ${i} has no URL, skipping`);
          continue;
        }

        const { data: clipData, error: downloadError } = await supabase.storage
          .from("broll")
          .download(clip.clipUrl);

        if (downloadError || !clipData) {
          console.error(`Error downloading clip ${i}:`, downloadError);
          continue;
        }

        const clipPath = `${tempDir}/clip_${i}.mp4`;
        await Deno.writeFile(clipPath, new Uint8Array(await clipData.arrayBuffer()));
        clipPaths.push(clipPath);
        console.log(`Downloaded clip ${i} to ${clipPath}`);
      }

      if (clipPaths.length === 0) {
        throw new Error("No clips were successfully downloaded");
      }

      // Step 2: Download voiceover if available
      let voiceoverPath: string | null = null;
      if (voiceoverUrl) {
        console.log("Downloading voiceover...");
        try {
          const voiceResponse = await fetch(voiceoverUrl);
          if (voiceResponse.ok) {
            const voiceData = await voiceResponse.arrayBuffer();
            voiceoverPath = `${tempDir}/voiceover.mp3`;
            await Deno.writeFile(voiceoverPath, new Uint8Array(voiceData));
            console.log("Voiceover downloaded to", voiceoverPath);
          }
        } catch (err) {
          console.error("Error downloading voiceover:", err);
        }
      }

      // Step 3: Save SRT file
      const srtPath = `${tempDir}/subtitles.srt`;
      await Deno.writeTextFile(srtPath, srtContent);
      console.log("SRT file saved to", srtPath);

      // Step 4: Create concat file for FFmpeg
      const concatFilePath = `${tempDir}/concat.txt`;
      const concatContent = clipPaths.map(path => `file '${path}'`).join('\n');
      await Deno.writeTextFile(concatFilePath, concatContent);
      console.log("Concat file created");

      // Step 5: Run FFmpeg to concatenate clips
      const concatenatedPath = `${tempDir}/concatenated.mp4`;
      console.log("Concatenating clips with FFmpeg...");
      
      const concatProcess = new Deno.Command("ffmpeg", {
        args: [
          "-f", "concat",
          "-safe", "0",
          "-i", concatFilePath,
          "-c", "copy",
          concatenatedPath
        ],
        stdout: "piped",
        stderr: "piped",
      });

      const concatResult = await concatProcess.output();
      if (!concatResult.success) {
        const error = new TextDecoder().decode(concatResult.stderr);
        console.error("FFmpeg concat error:", error);
        throw new Error("Failed to concatenate clips");
      }
      console.log("Clips concatenated successfully");

      // Step 6: Add voiceover if available
      let videoWithAudioPath = concatenatedPath;
      if (voiceoverPath) {
        console.log("Adding voiceover to video...");
        videoWithAudioPath = `${tempDir}/with_audio.mp4`;
        
        const audioProcess = new Deno.Command("ffmpeg", {
          args: [
            "-i", concatenatedPath,
            "-i", voiceoverPath,
            "-c:v", "copy",
            "-c:a", "aac",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            videoWithAudioPath
          ],
          stdout: "piped",
          stderr: "piped",
        });

        const audioResult = await audioProcess.output();
        if (!audioResult.success) {
          const error = new TextDecoder().decode(audioResult.stderr);
          console.error("FFmpeg audio overlay error:", error);
          // Continue without audio if it fails
          videoWithAudioPath = concatenatedPath;
        } else {
          console.log("Voiceover added successfully");
        }
      }

      // Step 7: Burn subtitles into video
      const finalVideoPath = `${tempDir}/final.mp4`;
      console.log("Burning subtitles...");
      
      const subtitleProcess = new Deno.Command("ffmpeg", {
        args: [
          "-i", videoWithAudioPath,
          "-vf", `subtitles=${srtPath}:force_style='FontName=Inter,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Shadow=0,Alignment=2,MarginV=50'`,
          "-c:a", "copy",
          "-preset", "fast",
          "-crf", "23",
          finalVideoPath
        ],
        stdout: "piped",
        stderr: "piped",
      });

      const subtitleResult = await subtitleProcess.output();
      if (!subtitleResult.success) {
        const error = new TextDecoder().decode(subtitleResult.stderr);
        console.error("FFmpeg subtitle error:", error);
        throw new Error("Failed to burn subtitles");
      }
      console.log("Subtitles burned successfully");

      // Step 8: Upload final video to renders bucket
      console.log("Uploading final video...");
      const finalVideoData = await Deno.readFile(finalVideoPath);
      const videoPath = `${variantId}/video.mp4`;
      
      const { error: uploadError } = await supabase.storage
        .from("renders")
        .upload(videoPath, finalVideoData, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error uploading video:", uploadError);
        throw uploadError;
      }
      console.log("Video uploaded successfully");

      // Step 9: Upload SRT file
      const srtStoragePath = `${variantId}/subtitles.srt`;
      const { error: srtUploadError } = await supabase.storage
        .from("renders")
        .upload(srtStoragePath, srtContent, {
          contentType: "text/plain",
          upsert: true,
        });

      if (srtUploadError) {
        console.error("Error uploading SRT:", srtUploadError);
      }

      // Create metadata
      const renderMetadata = {
        clips_count: clipPaths.length,
        has_voiceover: !!voiceoverPath,
        has_subtitles: true,
        resolution: "1080x1920",
        fps: 30,
        codec: "libx264",
        audio_codec: "aac",
        rendered_at: new Date().toISOString(),
      };

      // Update variant with results
      const { error: updateError } = await supabase
        .from("variants")
        .update({
          status: "completed",
          video_url: videoPath,
          srt_url: srtStoragePath,
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
          srtPath: srtStoragePath,
          metadata: renderMetadata,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } finally {
      // Cleanup temp directory
      try {
        await Deno.remove(tempDir, { recursive: true });
        console.log("Temp directory cleaned up");
      } catch (err) {
        console.error("Error cleaning up temp directory:", err);
      }
    }

  } catch (error) {
    console.error("Error in render-variant:", error);

    // Update variant status to error
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
