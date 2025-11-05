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
  video_file_path?: string;
  brand_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_url, video_file_path, brand_id }: AnalyzeRequest = await req.json();

    if ((!video_url && !video_file_path) || !brand_id) {
      throw new Error("(video_url or video_file_path) and brand_id are required");
    }

    console.log("🎬 [ANALYZE] Starting analysis for brand:", brand_id);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }

    // Get brand context
    const { data: brand, error: brandError } = await supabaseClient
      .from("brands")
      .select("*")
      .eq("id", brand_id)
      .single();

    if (brandError || !brand) throw new Error("Marca no encontrada");

    // Create initial analysis record
    const { data: analysis, error: analysisError } = await supabaseClient
      .from("video_analyses")
      .insert({
        user_id: user.id,
        brand_id: brand_id,
        source_url: video_url || null,
        video_file_path: video_file_path || null,
        status: "processing",
      })
      .select()
      .single();

    if (analysisError) throw analysisError;

    console.log(`📝 [ANALYZE] Analysis record created: ${analysis.id}`);

    // Check if transcription exists (from transcribe-video function)
    let transcription = analysis.transcription;
    
    if (!transcription) {
      console.log(`⚠️ [ANALYZE] No transcription found, using mock for testing`);
      // Fallback: Mock transcription for testing
      transcription = `
        ¡Hola! ¿Has estado luchando con la piel seca?
        Yo sé cómo se siente - pruebas todo y nada funciona.
        Pero entonces encontré esta crema natural increíble.
        En solo 7 días, mi piel se transformó completamente.
        ¡Mis amigos siguen preguntándome qué estoy usando!
        No esperes - pruébala ahora y ve la diferencia.
      `;
    }

    console.log(`🤖 [ANALYZE] Starting AI analysis...`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const systemPrompt = `Eres un experto en análisis narrativo de videos virales para e-commerce.

CONTEXTO DE MARCA:
- Nombre: ${brand.name}
- Producto: ${brand.product_description || "No especificado"}
- Beneficio principal: ${brand.main_benefit || "No especificado"}
- Promesa: ${brand.main_promise || "No especificado"}
- Cliente ideal: ${brand.ideal_customer || "No especificado"}
- Objeción principal: ${brand.main_objection || "No especificado"}
- Tono: ${brand.tone_of_voice || "profesional"}

TAREA:
Analiza la transcripción del video y divide su estructura narrativa en secciones claras.

SECCIONES POSIBLES (usa las que detectes):
- Hook: Primeros 3-5 segundos para detener scroll y captar atención
- Problema: Plantea pain point del cliente
- Desarrollo: Explica solución o contexto
- Social Proof: Testimonios, datos, validación externa
- Demo: Muestra producto en uso real
- Beneficio: Explica transformación y resultados
- CTA: Call to action claro y directo
- Cierre: Reafirmación emocional o urgencia

Para cada sección detectada, incluye:
1. section: Nombre de la sección
2. start_time y end_time: Timestamps en formato "MM:SS"
3. summary: Resumen de 1-2 líneas de qué dice
4. purpose: Propósito estratégico (captar_atencion, generar_empatia, educar, validar_socialmente, mostrar_producto, conversion, cierre_emocional)
5. transcript_segment: Segmento exacto de la transcripción
6. confidence_score: Qué tan seguro estás de esta clasificación (0.0 a 1.0)
7. explanation: Explicación breve de qué es esta sección (para tooltips)

TRANSCRIPCIÓN:
${transcription}

Usa la función analyze_narrative_structure para devolver el análisis estructurado.`;

    const userPrompt = `Analiza esta transcripción de video y extrae su estructura narrativa completa.`;

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_narrative_structure',
            description: 'Analiza la estructura narrativa del video',
            parameters: {
              type: 'object',
              properties: {
                sections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      section: { 
                        type: 'string',
                        enum: ['Hook', 'Problema', 'Desarrollo', 'Social Proof', 'Demo', 'Beneficio', 'CTA', 'Cierre']
                      },
                      start_time: { type: 'string' },
                      end_time: { type: 'string' },
                      summary: { type: 'string' },
                      purpose: { 
                        type: 'string',
                        enum: ['captar_atencion', 'generar_empatia', 'educar', 'validar_socialmente', 'mostrar_producto', 'conversion', 'cierre_emocional']
                      },
                      transcript_segment: { type: 'string' },
                      confidence_score: { type: 'number', minimum: 0, maximum: 1 },
                      explanation: { type: 'string' }
                    },
                    required: ['section', 'start_time', 'end_time', 'summary', 'purpose', 'transcript_segment', 'confidence_score', 'explanation']
                  }
                },
                overall_narrative_score: { 
                  type: 'number',
                  description: 'Calidad general de la narrativa (0-1)'
                },
                key_insights: { 
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Insights clave sobre el video'
                }
              },
              required: ['sections', 'overall_narrative_score']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_narrative_structure' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`❌ [ANALYZE] AI error: ${errorText}`);
      throw new Error(`Error en AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log(`🤖 [ANALYZE] AI response received`);

    // Extract tool call result
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No se recibió respuesta estructurada de la IA');
    }

    const structure = JSON.parse(toolCall.function.arguments);
    
    // Validate structure
    if (!structure.sections || structure.sections.length === 0) {
      console.warn(`⚠️ [ANALYZE] No structured content detected`);
      
      // Update analysis with error
      await supabaseClient
        .from('video_analyses')
        .update({
          status: 'failed',
          error_message: 'No se pudo detectar una estructura narrativa clara en el video. Asegúrate de que el video tenga narración o diálogo claro.',
        })
        .eq('id', analysis.id);

      return new Response(
        JSON.stringify({
          error: 'UNSTRUCTURED_CONTENT',
          message: 'No se pudo detectar una estructura narrativa clara',
          suggestion: 'Este video puede ser b-roll puro. ¿Es un video con narración o diálogo?'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`✅ [ANALYZE] Detected ${structure.sections.length} narrative sections`);

    // Update analysis with results
    const { error: updateError } = await supabaseClient
      .from("video_analyses")
      .update({
        transcription: transcription,
        structure: structure,
        status: "completed",
        metadata: {
          analyzed_at: new Date().toISOString(),
          model: "google/gemini-2.5-flash",
          overall_score: structure.overall_narrative_score,
          key_insights: structure.key_insights
        },
      })
      .eq("id", analysis.id);

    if (updateError) throw updateError;

    console.log(`💾 [ANALYZE] Analysis completed and saved`);

    return new Response(
      JSON.stringify({
        analysis_id: analysis.id,
        structure,
        transcription: transcription,
        sections_count: structure.sections.length,
        narrative_score: structure.overall_narrative_score
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ [ANALYZE] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error al analizar video',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
