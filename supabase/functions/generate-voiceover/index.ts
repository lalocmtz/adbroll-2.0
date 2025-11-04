import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ELEVENLABS_VOICES = {
  Sarah: "EXAVITQu4vr4xnSDxMaL", // Female, friendly
  Laura: "FGY2WhTYpPnrIDTdsKH5", // Female, professional
  Charlie: "IKne3meq5aSn9XLyUdCD", // Male, warm
  George: "JBFqnCBsd6RMkjVDRZzb", // Male, authoritative
  Aria: "9BWtsMINqrJLrRacOk9x",
  Roger: "CwhRBWXzGAHq8TQ4Fs17",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { script, voiceId, projectId } = await req.json();

    if (!script || !voiceId || !projectId) {
      throw new Error("script, voiceId, and projectId are required");
    }

    console.log("Generating voiceover for project:", projectId);

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    // Call ElevenLabs API
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const error = await elevenLabsResponse.text();
      console.error("ElevenLabs error:", error);
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    // Get audio buffer
    const audioBuffer = await elevenLabsResponse.arrayBuffer();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Upload to storage
    const fileName = `${projectId}/${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("renders")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("renders")
      .getPublicUrl(fileName);

    console.log("Voiceover generated successfully:", urlData.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl: urlData.publicUrl,
        fileName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-voiceover:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
