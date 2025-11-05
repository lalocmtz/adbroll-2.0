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
    const { templateId, brandId, sections } = await req.json();

    if (!templateId || !brandId || !sections) {
      throw new Error("templateId, brandId, and sections are required");
    }

    console.log("Generating scripts for template:", templateId);

    // Initialize Supabase
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get brand info
    const { data: brand, error: brandError } = await supabaseAdmin
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();

    if (brandError) throw brandError;

    // Build context for AI
    const brandContext = `
Marca: ${brand.name}
Producto: ${brand.product_description || "No especificado"}
Tono de voz: ${brand.tone_of_voice || "profesional"}
Promesa principal: ${brand.main_promise || "No especificada"}
Beneficio principal: ${brand.main_benefit || "No especificado"}
Cliente ideal: ${brand.ideal_customer || "No especificado"}
Objeción principal: ${brand.main_objection || "No especificada"}
    `.trim();

    // Build sections context
    const sectionsContext = sections
      .map(
        (s: any, idx: number) =>
          `${idx + 1}. ${s.type.toUpperCase()} (${s.title})
   Duración: ${s.expected_duration}s
   Propósito: ${s.description || "No especificado"}
   Prompt guía: ${s.text_prompt}`
      )
      .join("\n\n");

    // Call Lovable AI to generate scripts
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `Eres un copywriter experto en anuncios de video cortos para redes sociales (TikTok, Instagram Reels).

CONTEXTO DE LA MARCA:
${brandContext}

ESTRUCTURA DEL VIDEO:
${sectionsContext}

TAREA:
Genera un guión persuasivo y coherente para cada sección del video. Cada sección debe:
1. Ser concisa y adaptada a su duración (${sections.map((s: any) => `${s.type}: ${s.expected_duration}s`).join(", ")})
2. Usar el tono de voz especificado (${brand.tone_of_voice})
3. Mantener coherencia narrativa entre todas las secciones
4. Incluir la promesa y beneficio principal donde sea relevante
5. Abordar la objeción principal de forma sutil
6. Terminar con un CTA claro y directo

FORMATO DE RESPUESTA:
Devuelve SOLO un objeto JSON con esta estructura exacta:
{
  "scripts": [
    {
      "sectionId": "id_de_la_sección",
      "text": "texto_del_guión_para_esta_sección"
    }
  ]
}

IMPORTANTE: 
- No incluyas explicaciones adicionales, solo el JSON
- El texto debe ser natural, conversacional y listo para ser narrado
- Evita textos genéricos, sé específico a la marca
- Cada sección debe fluir naturalmente a la siguiente`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.8,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;

    console.log("Generated content:", generatedContent);

    // Parse the JSON response
    let parsedScripts;
    try {
      parsedScripts = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", generatedContent);
      throw new Error("Invalid AI response format");
    }

    // Map the AI response to use actual section IDs
    const mappedScripts = parsedScripts.scripts.map((script: any) => {
      const matchingSection = sections.find(
        (s: any) => s.type.toUpperCase() === script.sectionId.toUpperCase()
      );
      
      if (!matchingSection) {
        console.warn(`No matching section found for sectionId: ${script.sectionId}`);
      }
      
      return {
        sectionId: matchingSection?.id || script.sectionId,
        text: script.text,
      };
    });

    console.log('Mapping scripts:', {
      received: parsedScripts.scripts.map((s: any) => s.sectionId),
      sections: sections.map((s: any) => ({ id: s.id, type: s.type })),
      mapped: mappedScripts
    });

    return new Response(JSON.stringify({ scripts: mappedScripts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating scripts:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
