-- Add new fields to templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS use_case TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS preview_video_url TEXT;

-- Make slots nullable temporarily to allow default templates
ALTER TABLE templates ALTER COLUMN slots DROP NOT NULL;

-- Create template_sections table for structured sections
CREATE TABLE IF NOT EXISTS template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  expected_duration INTEGER NOT NULL,
  text_prompt TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on template_sections
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for template_sections
CREATE POLICY "Template sections viewable based on template access"
  ON template_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_sections.template_id
      AND (templates.is_public = true OR templates.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create sections for own templates"
  ON template_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_sections.template_id
      AND templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sections for own templates"
  ON template_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_sections.template_id
      AND templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sections for own templates"
  ON template_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_sections.template_id
      AND templates.user_id = auth.uid()
    )
  );

-- Insert 5 default templates
INSERT INTO templates (name, description, use_case, is_public, user_id, slots) VALUES
  ('Problema - Solución', 'Presenta un problema común y muestra cómo tu producto lo soluciona', 'Ideal para productos que resuelven pain points claros', true, NULL, '[]'::jsonb),
  ('TikTok Shop Demo', 'Muestra tu producto en acción con características destacadas', 'Perfecto para demos de producto en TikTok Shop', true, NULL, '[]'::jsonb),
  ('Retargeting', 'Reconecta con usuarios que ya conocen tu marca', 'Ideal para campañas de retargeting y remarketing', true, NULL, '[]'::jsonb),
  ('Urgencia', 'Crea sensación de escasez y urgencia para impulsar ventas', 'Perfecto para ofertas limitadas y lanzamientos', true, NULL, '[]'::jsonb),
  ('Oferta Especial', 'Destaca una promoción irresistible con comparativa de valor', 'Ideal para promociones y descuentos especiales', true, NULL, '[]'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert sections for "Problema - Solución" template
INSERT INTO template_sections (template_id, type, title, description, expected_duration, text_prompt, order_index)
SELECT id, 'hook', 'Hook', 'Captura atención inmediata', 3, 
  'Crea una frase impactante para captar atención, relacionada con el problema que resuelve {brand_name}, en el sector {industry}. Tono: {tone}.', 1
FROM templates WHERE name = 'Problema - Solución' AND is_public = true
UNION ALL
SELECT id, 'problema', 'Problema', 'Describe el dolor del cliente', 5,
  'Describe un problema común del cliente ideal de {brand_name}, en tono emocional y directo.', 2
FROM templates WHERE name = 'Problema - Solución' AND is_public = true
UNION ALL
SELECT id, 'solucion', 'Solución', 'Presenta tu producto como solución', 5,
  'Explica cómo {brand_name} soluciona ese problema. Enfatiza el beneficio más poderoso.', 3
FROM templates WHERE name = 'Problema - Solución' AND is_public = true
UNION ALL
SELECT id, 'social_proof', 'Social Proof', 'Muestra credibilidad', 4,
  'Simula un testimonio o resultado real de clientes de {brand_name}.', 4
FROM templates WHERE name = 'Problema - Solución' AND is_public = true
UNION ALL
SELECT id, 'cta', 'CTA', 'Llamada a la acción', 3,
  'Crea una llamada a la acción clara, breve y persuasiva para {brand_name}.', 5
FROM templates WHERE name = 'Problema - Solución' AND is_public = true;

-- Insert sections for "TikTok Shop Demo" template
INSERT INTO template_sections (template_id, type, title, description, expected_duration, text_prompt, order_index)
SELECT id, 'hook', 'Hook', 'Captura atención con el producto', 3,
  'Crea una frase impactante para captar atención mostrando {brand_name}. Tono: {tone}.', 1
FROM templates WHERE name = 'TikTok Shop Demo' AND is_public = true
UNION ALL
SELECT id, 'showcase', 'Showcase', 'Muestra el producto visualmente', 5,
  'Describe visualmente {brand_name} destacando su presentación y diseño.', 2
FROM templates WHERE name = 'TikTok Shop Demo' AND is_public = true
UNION ALL
SELECT id, 'caracteristicas', 'Características', 'Lista beneficios clave', 5,
  'Lista 3 características principales de {brand_name} que lo hacen único.', 3
FROM templates WHERE name = 'TikTok Shop Demo' AND is_public = true
UNION ALL
SELECT id, 'testimonio', 'Testimonio', 'Prueba social', 4,
  'Simula un testimonio entusiasta de un cliente de {brand_name}.', 4
FROM templates WHERE name = 'TikTok Shop Demo' AND is_public = true
UNION ALL
SELECT id, 'cta', 'CTA', 'Impulso a compra', 3,
  'Crea un CTA directo para comprar {brand_name} en TikTok Shop.', 5
FROM templates WHERE name = 'TikTok Shop Demo' AND is_public = true;

-- Insert sections for "Retargeting" template
INSERT INTO template_sections (template_id, type, title, description, expected_duration, text_prompt, order_index)
SELECT id, 'retargeting_intro', 'Retargeting Intro', 'Reconoce interés previo', 3,
  'Crea una frase que reconozca el interés previo del usuario en {brand_name} y lo motive a regresar.', 1
FROM templates WHERE name = 'Retargeting' AND is_public = true
UNION ALL
SELECT id, 'beneficio', 'Beneficio', 'Refuerza valor principal', 5,
  'Refuerza el beneficio principal de {brand_name} que el usuario ya conoce.', 2
FROM templates WHERE name = 'Retargeting' AND is_public = true
UNION ALL
SELECT id, 'oferta', 'Oferta', 'Presenta incentivo especial', 4,
  'Presenta una oferta especial o incentivo para usuarios que regresan a {brand_name}.', 3
FROM templates WHERE name = 'Retargeting' AND is_public = true
UNION ALL
SELECT id, 'testimonio', 'Testimonio', 'Refuerza credibilidad', 4,
  'Comparte un resultado o testimonio reciente de {brand_name}.', 4
FROM templates WHERE name = 'Retargeting' AND is_public = true
UNION ALL
SELECT id, 'cta', 'CTA', 'Acción inmediata', 3,
  'CTA urgente para que el usuario complete su compra de {brand_name}.', 5
FROM templates WHERE name = 'Retargeting' AND is_public = true;

-- Insert sections for "Urgencia" template
INSERT INTO template_sections (template_id, type, title, description, expected_duration, text_prompt, order_index)
SELECT id, 'hook', 'Hook', 'Urgencia inmediata', 3,
  'Crea un hook que genere urgencia sobre una oferta limitada de {brand_name}.', 1
FROM templates WHERE name = 'Urgencia' AND is_public = true
UNION ALL
SELECT id, 'beneficio', 'Beneficio', 'Valor del producto', 4,
  'Destaca el beneficio principal de {brand_name} rápidamente.', 2
FROM templates WHERE name = 'Urgencia' AND is_public = true
UNION ALL
SELECT id, 'cuenta_regresiva', 'Cuenta Regresiva', 'Tiempo limitado', 4,
  'Redacta una frase con escasez o urgencia relacionada a una promo de {brand_name}.', 3
FROM templates WHERE name = 'Urgencia' AND is_public = true
UNION ALL
SELECT id, 'oferta', 'Oferta', 'Detalle de promoción', 5,
  'Explica los detalles de la oferta limitada de {brand_name}.', 4
FROM templates WHERE name = 'Urgencia' AND is_public = true
UNION ALL
SELECT id, 'cta', 'CTA', 'Acción urgente', 3,
  'CTA con urgencia para que actúen ahora con {brand_name}.', 5
FROM templates WHERE name = 'Urgencia' AND is_public = true;

-- Insert sections for "Oferta Especial" template
INSERT INTO template_sections (template_id, type, title, description, expected_duration, text_prompt, order_index)
SELECT id, 'hook', 'Hook', 'Anuncia la oferta', 3,
  'Anuncia una oferta especial de {brand_name} de forma impactante.', 1
FROM templates WHERE name = 'Oferta Especial' AND is_public = true
UNION ALL
SELECT id, 'explicacion', 'Explicación', 'Qué incluye la oferta', 5,
  'Explica qué incluye la oferta especial de {brand_name}.', 2
FROM templates WHERE name = 'Oferta Especial' AND is_public = true
UNION ALL
SELECT id, 'comparativa', 'Comparativa', 'Valor vs precio', 5,
  'Explica una promoción activa de {brand_name}, comparando valor vs. precio. Usa lenguaje atractivo.', 3
FROM templates WHERE name = 'Oferta Especial' AND is_public = true
UNION ALL
SELECT id, 'bonus', 'Bonus', 'Extras incluidos', 4,
  'Menciona bonos o extras adicionales incluidos en la oferta de {brand_name}.', 4
FROM templates WHERE name = 'Oferta Especial' AND is_public = true
UNION ALL
SELECT id, 'cta', 'CTA', 'Aprovecha ahora', 3,
  'CTA persuasivo para aprovechar la oferta de {brand_name} ahora.', 5
FROM templates WHERE name = 'Oferta Especial' AND is_public = true;