import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { fileId, fileUrl, fileName } = await req.json();

    if (!fileId || !fileUrl || !fileName) {
      throw new Error('Missing required parameters: fileId, fileUrl, fileName');
    }

    console.log(`Generating thumbnail for file: ${fileName}`);

    // Download the video file
    const videoResponse = await fetch(fileUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoPath = `/tmp/${Date.now()}_${fileName}`;
    const thumbnailPath = `/tmp/${Date.now()}_thumb.jpg`;

    // Write video to temp file
    await Deno.writeFile(videoPath, new Uint8Array(await videoBlob.arrayBuffer()));

    console.log('Video downloaded, generating thumbnail with FFmpeg...');

    // Generate thumbnail using FFmpeg
    const ffmpegCommand = new Deno.Command("ffmpeg", {
      args: [
        "-i", videoPath,
        "-ss", "00:00:01",
        "-vframes", "1",
        "-vf", "scale=480:-1",
        "-q:v", "2",
        thumbnailPath
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await ffmpegCommand.output();

    if (code !== 0) {
      const errorString = new TextDecoder().decode(stderr);
      console.error('FFmpeg error:', errorString);
      throw new Error(`FFmpeg failed with code ${code}`);
    }

    console.log('Thumbnail generated, uploading to storage...');

    // Read the generated thumbnail
    const thumbnailData = await Deno.readFile(thumbnailPath);

    // Upload thumbnail to Supabase storage
    const thumbnailFileName = `${fileId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(thumbnailFileName, thumbnailData, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(thumbnailFileName);

    console.log('Thumbnail uploaded, updating database...');

    // Update database with thumbnail URL
    const { error: updateError } = await supabase
      .from('broll_files')
      .update({ thumbnail_url: publicUrl })
      .eq('id', fileId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    // Cleanup temp files
    try {
      await Deno.remove(videoPath);
      await Deno.remove(thumbnailPath);
    } catch (cleanupError) {
      console.warn('Cleanup error (non-critical):', cleanupError);
    }

    console.log('Thumbnail generation complete!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        thumbnail_url: publicUrl 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error generating thumbnail:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
