-- ================================================
-- AdBroll Database Schema Updates
-- Phase 1: Foundation tables and storage
-- ================================================

-- 1. Add AI context fields to brands table
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS product_description TEXT,
ADD COLUMN IF NOT EXISTS main_promise TEXT,
ADD COLUMN IF NOT EXISTS main_benefit TEXT,
ADD COLUMN IF NOT EXISTS ideal_customer TEXT,
ADD COLUMN IF NOT EXISTS main_objection TEXT,
ADD COLUMN IF NOT EXISTS tone_of_voice TEXT DEFAULT 'professional';

-- 2. Create broll_files table for organizing video clips
CREATE TABLE IF NOT EXISTS public.broll_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  folder TEXT NOT NULL DEFAULT 'General',
  name TEXT NOT NULL,
  duration INTEGER,
  file_size BIGINT,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on broll_files
ALTER TABLE public.broll_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broll_files
CREATE POLICY "Users can view own broll"
  ON public.broll_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own broll"
  ON public.broll_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own broll"
  ON public.broll_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own broll"
  ON public.broll_files FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on broll_files
CREATE TRIGGER update_broll_files_updated_at
  BEFORE UPDATE ON public.broll_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for broll_files
CREATE INDEX idx_broll_files_user_id ON public.broll_files(user_id);
CREATE INDEX idx_broll_files_brand_id ON public.broll_files(brand_id);
CREATE INDEX idx_broll_files_folder ON public.broll_files(folder);

-- 3. Create video_analyses table
CREATE TABLE IF NOT EXISTS public.video_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  transcription TEXT,
  structure JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on video_analyses
ALTER TABLE public.video_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_analyses
CREATE POLICY "Users can view own analyses"
  ON public.video_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create analyses"
  ON public.video_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for video_analyses
CREATE INDEX idx_video_analyses_user_id ON public.video_analyses(user_id);
CREATE INDEX idx_video_analyses_status ON public.video_analyses(status);
CREATE INDEX idx_video_analyses_brand_id ON public.video_analyses(brand_id);

-- 4. Update projects table with new columns
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES public.video_analyses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS script_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS generated_script TEXT;

-- 5. Create storage buckets for broll and renders
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('broll', 'broll', false, 524288000, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']),
  ('renders', 'renders', false, 524288000, ARRAY['video/mp4', 'audio/mpeg', 'application/x-subrip'])
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for broll bucket
CREATE POLICY "Users can upload own broll"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'broll' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own broll"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'broll' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own broll"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'broll' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own broll"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'broll' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS Policies for renders bucket
CREATE POLICY "Users can upload renders"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'renders' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own renders"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'renders' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own renders"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'renders' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );