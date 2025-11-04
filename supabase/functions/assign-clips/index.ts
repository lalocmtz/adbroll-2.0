import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import OpenAI from "https://esm.sh/openai@4.20.1";

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
    const { scriptSections, brandId, userId } = await req.json();

    if (!scriptSections || !brandId || !userId) {
      throw new Error("scriptSections, brandId, and userId are required");
    }

    console.log("Assigning clips for brand:", brandId);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all available B-roll for this brand with folder info
    const { data: brollFiles, error: brollError } = await supabase
      .from("broll_files")
      .select(`
        id,
        name,
        file_url,
        folder_id,
        broll_folders!inner(name)
      `)
      .eq("brand_id", brandId)
      .eq("user_id", userId);

    if (brollError) throw brollError;

    if (!brollFiles || brollFiles.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No B-roll files found for this brand",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format B-roll data for GPT
    const brollList = brollFiles.map((file: any) => ({
      id: file.id,
      name: file.name,
      folder: file.broll_folders?.name || "Sin carpeta",
      url: file.file_url,
    }));

    // Create OpenAI client
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Build prompt for clip assignment
    const prompt = `Eres un experto en edición de videos para TikTok/Reels.

SECCIONES DEL GUION:
${JSON.stringify(scriptSections, null, 2)}

B-ROLL DISPONIBLE:
${JSON.stringify(brollList, null, 2)}

TAREA:
Para cada sección del guion, sugiere los 3 mejores clips de B-roll que coincidan con el contenido.

Las carpetas del B-roll son:
- Hook: Videos llamativos para los primeros 3 segundos
- CTA: Videos para el call-to-action final
- Usando el producto: Demostraciones del producto en uso
- Social proof: Testimonios, reseñas, resultados
- Uso diario: Casos de uso cotidianos

IMPORTANTE:
- Cada sección debe tener al menos 1 clip asignado
- Prioriza clips de la carpeta más relevante
- Si hay duda, sugiere múltiples opciones

Responde en formato JSON:
{
  "assignments": [
    {
      "section_index": 0,
      "section_type": "hook",
      "section_text": "...",
      "suggested_clips": [
        {
          "clip_id": "uuid",
          "confidence": 0.9,
          "reason": "Este clip de la carpeta Hook es perfecto porque..."
        }
      ]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "Eres un experto en edición de videos. Respondes solo en JSON válido.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    console.log("Clip assignments generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        assignments: result.assignments || [],
        availableClips: brollList,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in assign-clips:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
