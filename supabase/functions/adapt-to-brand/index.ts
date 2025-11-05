import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdaptRequest {
  analysis_id: string;
  brand_id: string;
  adaptation_preferences?: {
    tone?: string;
    formality?: string;
    emoji_style?: string;
    language?: string;
    custom_instructions?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysis_id, brand_id, adaptation_preferences }: AdaptRequest = await req.json();
    
    console.log(`🎨 [ADAPT] Starting brand adaptation for analysis: ${analysis_id}`);

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no configurada');
    }

    // Fetch analysis
    const { data: analysis, error: analysisError } = await supabaseClient
      .from('video_analyses')
      .select('*')
      .eq('id', analysis_id)
      .single();

    if (analysisError || !analysis) {
      throw new Error('Análisis no encontrado');
    }

    // Fetch brand details
    const { data: brand, error: brandError } = await supabaseClient
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      throw new Error('Marca no encontrada');
    }

    // Fetch or use default adaptation preferences
    let prefs = adaptation_preferences;
    
    if (!prefs) {
      const { data: savedPrefs } = await supabaseClient
        .from('brand_adaptation_preferences')
        .select('*')
        .eq('brand_id', brand_id)
        .maybeSingle();
      
      prefs = savedPrefs || {
        tone: 'profesional',
        formality: 'casual',
        emoji_style: 'moderado',
        language: 'es-MX',
        custom_instructions: undefined
      };
    }

    // TypeScript assertion: prefs is guaranteed to be defined here
    const preferences = prefs!;

    console.log(`📋 [ADAPT] Using preferences:`, preferences);

    // Build adaptation prompt
    const systemPrompt = `Eres un experto copywriter especializado en adaptar contenido viral a marcas específicas.

CONTEXTO DE LA MARCA:
- Nombre: ${brand.name}
- Producto: ${brand.product_description || 'No especificado'}
- Beneficio principal: ${brand.main_benefit || 'No especificado'}
- Promesa: ${brand.main_promise || 'No especificado'}
- Cliente ideal: ${brand.ideal_customer || 'No especificado'}
- Objeción principal: ${brand.main_objection || 'No especificado'}

PREFERENCIAS DE ADAPTACIÓN:
- Tono: ${preferences.tone}
- Formalidad: ${preferences.formality}
- Uso de emojis: ${preferences.emoji_style}
- Idioma: ${preferences.language}
${preferences.custom_instructions ? `- Instrucciones adicionales: ${preferences.custom_instructions}` : ''}

ESTRUCTURA ORIGINAL DEL VIDEO:
${JSON.stringify(analysis.structure, null, 2)}

TRANSCRIPCIÓN ORIGINAL:
${analysis.transcription}

TAREA:
Adapta cada sección del video para que refleje la voz, valores y oferta de esta marca específica.
Mantén la estructura narrativa original pero reescribe el contenido para que:
1. Use el tono y formalidad especificados
2. Mencione el producto/servicio de la marca
3. Aborde la objeción principal
4. Destaque el beneficio y promesa clave
5. Hable directamente al cliente ideal

Devuelve la estructura adaptada usando la función adapt_video_to_brand.`;

    const userPrompt = `Adapta este análisis de video viral a la marca ${brand.name}, manteniendo su estructura pero personalizando cada sección.`;

    // Call Lovable AI with tool calling
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
            name: 'adapt_video_to_brand',
            description: 'Adapta la estructura de video a una marca específica',
            parameters: {
              type: 'object',
              properties: {
                adapted_sections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      section: { type: 'string' },
                      original_content: { type: 'string' },
                      adapted_content: { type: 'string' },
                      adaptation_notes: { type: 'string' }
                    },
                    required: ['section', 'adapted_content']
                  }
                },
                overall_adaptation_score: { 
                  type: 'number',
                  description: 'Score de qué tan bien se adaptó (0-1)'
                },
                brand_alignment_notes: { type: 'string' }
              },
              required: ['adapted_sections']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'adapt_video_to_brand' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`❌ [ADAPT] AI error: ${errorText}`);
      throw new Error(`Error en AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log(`🤖 [ADAPT] AI response received`);

    // Extract tool call result
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No se recibió respuesta estructurada de la IA');
    }

    const adaptedData = JSON.parse(toolCall.function.arguments);
    console.log(`✅ [ADAPT] Adaptation completed: ${adaptedData.adapted_sections?.length || 0} sections`);

    // Store adapted version in metadata
    const { error: updateError } = await supabaseClient
      .from('video_analyses')
      .update({
        metadata: {
          ...analysis.metadata,
          brand_adaptation: {
            brand_id,
            adapted_at: new Date().toISOString(),
            preferences: preferences,
            adapted_sections: adaptedData.adapted_sections,
            adaptation_score: adaptedData.overall_adaptation_score,
            notes: adaptedData.brand_alignment_notes
          }
        }
      })
      .eq('id', analysis_id);

    if (updateError) {
      throw new Error(`Error al guardar adaptación: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        adapted_sections: adaptedData.adapted_sections,
        adaptation_score: adaptedData.overall_adaptation_score,
        notes: adaptedData.brand_alignment_notes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ [ADAPT] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error al adaptar a marca',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});