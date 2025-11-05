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
    const { text, voiceId, settings } = await req.json();

    if (!text || !voiceId) {
      throw new Error("text and voiceId are required");
    }

    console.log("Generating voice preview for:", voiceId);

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    // Call ElevenLabs API with preview text
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
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: settings?.stability ?? 0.5,
            similarity_boost: settings?.similarity_boost ?? 0.75,
            style: settings?.style ?? 0,
            use_speaker_boost: settings?.use_speaker_boost ?? false,
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

    // Upload to storage (temporary preview)
    const fileName = `previews/${voiceId}-${Date.now()}.mp3`;
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

    console.log("Voice preview generated:", urlData.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl: urlData.publicUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in preview-voice:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
