-- Add storage_path column to broll_files table
ALTER TABLE public.broll_files 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Make file_url nullable since we'll use storage_path for private buckets
ALTER TABLE public.broll_files 
ALTER COLUMN file_url DROP NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_broll_files_storage_path 
ON public.broll_files(storage_path);

-- Add comment explaining the fields
COMMENT ON COLUMN public.broll_files.storage_path IS 'Storage path in the broll bucket (for private files)';
COMMENT ON COLUMN public.broll_files.file_url IS 'Legacy field - use storage_path with signed URLs instead';