import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  video_url: string;
  brand_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_url, brand_id }: AnalyzeRequest = await req.json();

    if (!video_url || !brand_id) {
      throw new Error("video_url and brand_id are required");
    }

    console.log("Analyzing video:", video_url, "for brand:", brand_id);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Get brand context
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brand_id)
      .single();

    if (brandError || !brand) throw new Error("Brand not found");

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

    // For MVP: Mock transcription (in production, use Whisper API or download video)
    const mockTranscription = `
      Hey! Have you been struggling with dry skin? 
      I know the feeling - you try everything and nothing works.
      But then I found this amazing natural cream.
      In just 7 days, my skin was completely transformed.
      My friends keep asking me what I'm using!
      Don't wait - try it now and see the difference.
    `;

    console.log("Analyzing with GPT-4...");

    // Analyze with GPT-4
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const analysisPrompt = `
Eres un experto en análisis de anuncios de video.

CONTEXTO DE LA MARCA:
- Producto: ${brand.product_description || "No especificado"}
- Promesa: ${brand.main_promise || "No especificado"}
- Cliente ideal: ${brand.ideal_customer || "No especificado"}
- Beneficio: ${brand.main_benefit || "No especificado"}
- Objeción: ${brand.main_objection || "No especificado"}
- Tono: ${brand.tone_of_voice || "professional"}

TRANSCRIPCIÓN DEL VIDEO:
${mockTranscription}

TAREA:
Analiza este video y extrae su estructura en formato JSON.

Responde SOLO con JSON válido (sin markdown, sin explicaciones), en este formato exacto:

{
  "duration": 30,
  "hook": {
    "text": "...",
    "start_time": 0,
    "end_time": 3,
    "type": "problem"
  },
  "sections": [
    {
      "type": "problema",
      "text": "...",
      "start_time": 3,
      "end_time": 8
    },
    {
      "type": "agitacion",
      "text": "...",
      "start_time": 8,
      "end_time": 12
    },
    {
      "type": "solucion",
      "text": "...",
      "start_time": 12,
      "end_time": 20
    },
    {
      "type": "beneficios",
      "text": "...",
      "start_time": 20,
      "end_time": 25
    },
    {
      "type": "cta",
      "text": "...",
      "start_time": 25,
      "end_time": 30
    }
  ],
  "key_phrases": ["frase ganadora 1", "frase ganadora 2"],
  "visual_notes": "Qué elementos visuales se usan"
}
`;

    const gptResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Eres un experto en análisis de videos publicitarios. Respondes SOLO con JSON válido.",
            },
            {
              role: "user",
              content: analysisPrompt,
            },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("OpenAI error:", errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const gptData = await gptResponse.json();
    const structureText = gptData.choices[0].message.content;

    console.log("GPT-4 response:", structureText);

    // Parse JSON response
    let structure;
    try {
      structure = JSON.parse(structureText);
    } catch (e) {
      console.error("Failed to parse GPT response:", structureText);
      throw new Error("Failed to parse AI response");
    }

    // Update analysis with results
    const { error: updateError } = await supabase
      .from("video_analyses")
      .update({
        transcription: mockTranscription,
        structure: structure,
        status: "completed",
        metadata: {
          analyzed_at: new Date().toISOString(),
          model: "gpt-4o-mini",
        },
      })
      .eq("id", analysis.id);

    if (updateError) throw updateError;

    console.log("Analysis completed successfully");

    return new Response(
      JSON.stringify({
        analysis_id: analysis.id,
        structure,
        transcription: mockTranscription,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in analyze-video:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
