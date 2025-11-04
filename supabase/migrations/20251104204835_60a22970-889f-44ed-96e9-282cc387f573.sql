-- Create broll_folders table
CREATE TABLE IF NOT EXISTS public.broll_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_broll_folders_user_brand ON public.broll_folders(user_id, brand_id);
CREATE INDEX idx_broll_folders_brand ON public.broll_folders(brand_id);

-- Enable RLS
ALTER TABLE public.broll_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broll_folders
CREATE POLICY "Users can view own folders"
  ON public.broll_folders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
  ON public.broll_folders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON public.broll_folders
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON public.broll_folders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add folder_id column to broll_files (nullable to allow migration)
ALTER TABLE public.broll_files 
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.broll_folders(id) ON DELETE SET NULL;

-- Create index for folder_id
CREATE INDEX IF NOT EXISTS idx_broll_files_folder ON public.broll_files(folder_id);

-- Function to create default folders for a brand
CREATE OR REPLACE FUNCTION public.create_default_broll_folders()
RETURNS TRIGGER AS $$
BEGIN
  -- Create 5 default folders for the new brand
  INSERT INTO public.broll_folders (user_id, brand_id, name, is_default)
  VALUES
    (NEW.user_id, NEW.id, 'Hook', true),
    (NEW.user_id, NEW.id, 'Desarrollo del producto', true),
    (NEW.user_id, NEW.id, 'Usos del producto', true),
    (NEW.user_id, NEW.id, 'Call to Action', true),
    (NEW.user_id, NEW.id, 'Social Proof', true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create folders when a brand is created
DROP TRIGGER IF EXISTS trigger_create_default_folders ON public.brands;
CREATE TRIGGER trigger_create_default_folders
  AFTER INSERT ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_broll_folders();

-- Add trigger for updated_at on broll_folders
DROP TRIGGER IF EXISTS update_broll_folders_updated_at ON public.broll_folders;
CREATE TRIGGER update_broll_folders_updated_at
  BEFORE UPDATE ON public.broll_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();