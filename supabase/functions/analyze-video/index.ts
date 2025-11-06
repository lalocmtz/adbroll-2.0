import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  video_url?: string;
  brand_id?: string | null;
  analysis_id?: string;
  video_file_path?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_url, brand_id, analysis_id, video_file_path }: AnalyzeRequest = await req.json();

    if (!analysis_id) {
      throw new Error("analysis_id is required");
    }

    console.log("[ANALYZE] Starting analysis for analysis_id:", analysis_id, "brand_id:", brand_id || "none");

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

    // Get brand context (optional)
    let brand = null;
    if (brand_id) {
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", brand_id)
        .maybeSingle();

      if (!brandError && brandData) {
        brand = brandData;
        console.log("[ANALYZE] Using brand context:", brand.name);
      }
    }

    // Get or create analysis record
    let analysis;
    if (analysis_id) {
      // Use existing analysis record with transcription
      const { data: existingAnalysis, error: fetchError } = await supabase
        .from("video_analyses")
        .select("*")
        .eq("id", analysis_id)
        .single();

      if (fetchError || !existingAnalysis) {
        throw new Error("Analysis record not found");
      }

      analysis = existingAnalysis;
      console.log("[ANALYZE] Using existing analysis:", analysis.id);
    } else {
      // Create new analysis record (backward compatibility)
      const { data: newAnalysis, error: analysisError } = await supabase
        .from("video_analyses")
        .insert({
          user_id: user.id,
          brand_id: brand_id,
          source_url: video_url || "",
          video_file_path: video_file_path,
          status: "processing",
        })
        .select()
        .single();

      if (analysisError) throw analysisError;
      analysis = newAnalysis;
      console.log("[ANALYZE] Created new analysis:", analysis.id);
    }

    // Get transcription
    const transcription = analysis.transcription;
    
    if (!transcription) {
      // Update status to failed
      await supabase
        .from("video_analyses")
        .update({
          status: "failed",
          error_message: "No transcription available. Please transcribe the video first.",
        })
        .eq("id", analysis.id);
      
      throw new Error("No transcription found. Please ensure the video was transcribed first.");
    }

    console.log("[ANALYZE] Analyzing with AI, transcription length:", transcription.length);

    // Analyze with GPT-4
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const analysisPrompt = `
Eres un experto en análisis de anuncios de video.

${brand ? `
CONTEXTO DE LA MARCA:
- Producto: ${brand.product_description || "No especificado"}
- Promesa: ${brand.main_promise || "No especificado"}
- Cliente ideal: ${brand.ideal_customer || "No especificado"}
- Beneficio: ${brand.main_benefit || "No especificado"}
- Objeción: ${brand.main_objection || "No especificado"}
- Tono: ${brand.tone_of_voice || "professional"}
` : `
ANÁLISIS GENÉRICO:
Analiza la estructura del video sin adaptarlo a ninguna marca específica.
`}

TRANSCRIPCIÓN DEL VIDEO:
${transcription}

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
        transcription: transcription,
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
