-- ============================================
-- FASE 1: Actualizar tabla video_analyses
-- ============================================

-- Agregar columnas de feedback y calidad
ALTER TABLE video_analyses 
ADD COLUMN IF NOT EXISTS analysis_quality_score INTEGER CHECK (analysis_quality_score >= 0 AND analysis_quality_score <= 100),
ADD COLUMN IF NOT EXISTS user_feedback TEXT,
ADD COLUMN IF NOT EXISTS feedback_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS video_file_path TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Agregar comentarios para documentación
COMMENT ON COLUMN video_analyses.analysis_quality_score IS 'Score de calidad del análisis (0-100) para aprendizaje continuo';
COMMENT ON COLUMN video_analyses.user_feedback IS 'Feedback textual del usuario sobre el análisis';
COMMENT ON COLUMN video_analyses.video_file_path IS 'Path del archivo de video subido a storage (si aplica)';
COMMENT ON COLUMN video_analyses.thumbnail_url IS 'URL del frame representativo del video';

-- ============================================
-- FASE 2: Crear tabla brand_adaptation_preferences
-- ============================================

CREATE TABLE IF NOT EXISTS brand_adaptation_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  tone TEXT DEFAULT 'profesional' CHECK (tone IN ('emocional', 'casual', 'formal', 'energetico', 'profesional', 'divertido')),
  formality TEXT DEFAULT 'casual' CHECK (formality IN ('casual', 'semi-formal', 'formal')),
  emoji_style TEXT DEFAULT 'moderado' CHECK (emoji_style IN ('ninguno', 'moderado', 'abundante')),
  language TEXT DEFAULT 'es-MX',
  custom_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(brand_id)
);

-- Enable RLS
ALTER TABLE brand_adaptation_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own brand preferences"
  ON brand_adaptation_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_adaptation_preferences.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create preferences for own brands"
  ON brand_adaptation_preferences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_adaptation_preferences.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own brand preferences"
  ON brand_adaptation_preferences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_adaptation_preferences.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own brand preferences"
  ON brand_adaptation_preferences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_adaptation_preferences.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_brand_adaptation_preferences_updated_at
  BEFORE UPDATE ON brand_adaptation_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FASE 3: Storage bucket para videos subidos
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploaded-videos', 'uploaded-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies para uploaded-videos
CREATE POLICY "Users can upload their own videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'uploaded-videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'uploaded-videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'uploaded-videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- FASE 4: Índices para optimización
-- ============================================

CREATE INDEX IF NOT EXISTS idx_video_analyses_brand_id ON video_analyses(brand_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_user_status ON video_analyses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_brand_adaptation_preferences_brand_id ON brand_adaptation_preferences(brand_id);