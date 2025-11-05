-- Enable realtime for variants table
ALTER TABLE public.variants REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.variants;