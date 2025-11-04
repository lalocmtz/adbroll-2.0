import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateScriptRequest {
  analysis_id: string;
  variant_count?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysis_id, variant_count = 3 }: GenerateScriptRequest =
      await req.json();

    if (!analysis_id) {
      throw new Error("analysis_id is required");
    }

    console.log("Generating scripts for analysis:", analysis_id);

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

    // Get analysis
    const { data: analysis, error: analysisError } = await supabase
      .from("video_analyses")
      .select("*, brands(*)")
      .eq("id", analysis_id)
      .single();

    if (analysisError || !analysis) throw new Error("Analysis not found");

    const brand = analysis.brands;
    const structure = analysis.structure;

    console.log("Generating variants with GPT-4...");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const scriptPrompt = `
ESTRUCTURA ORIGINAL:
${JSON.stringify(structure, null, 2)}

CONTEXTO DE MARCA:
- Producto: ${brand.product_description}
- Promesa: ${brand.main_promise}
- Cliente ideal: ${brand.ideal_customer}
- Beneficio: ${brand.main_benefit}
- Objeción: ${brand.main_objection}
- Tono: ${brand.tone_of_voice}

TAREA:
Genera ${variant_count} variantes de guion manteniendo la estructura temporal pero adaptando el copy para esta marca.

Cada variante debe tener un enfoque diferente:
- Variante 1: Hook de curiosidad + CTA directo
- Variante 2: Hook de problema + CTA con oferta
- Variante 3: Hook de estadística + CTA con urgencia

Responde SOLO con JSON válido (sin markdown, sin explicaciones):

[
  {
    "variant_name": "Curiosidad + Directo",
    "hook_type": "curiosity",
    "estimated_duration": 30,
    "sections": [
      {"type": "hook", "text": "...", "duration": 3},
      {"type": "problema", "text": "...", "duration": 5},
      {"type": "agitacion", "text": "...", "duration": 4},
      {"type": "solucion", "text": "...", "duration": 8},
      {"type": "beneficios", "text": "...", "duration": 5},
      {"type": "cta", "text": "...", "duration": 5}
    ]
  },
  ...
]
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
                "Eres un experto copywriter de anuncios. Respondes SOLO con JSON válido.",
            },
            {
              role: "user",
              content: scriptPrompt,
            },
          ],
          temperature: 0.8,
        }),
      }
    );

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("OpenAI error:", errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const gptData = await gptResponse.json();
    const variantsText = gptData.choices[0].message.content;

    console.log("GPT-4 response:", variantsText);

    // Parse JSON response
    let variants;
    try {
      variants = JSON.parse(variantsText);
    } catch (e) {
      console.error("Failed to parse GPT response:", variantsText);
      throw new Error("Failed to parse AI response");
    }

    console.log("Generated", variants.length, "script variants");

    return new Response(
      JSON.stringify({
        variants,
        analysis_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-script:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
