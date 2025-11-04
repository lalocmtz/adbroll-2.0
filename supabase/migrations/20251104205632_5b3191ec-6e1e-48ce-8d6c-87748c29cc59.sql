-- Update the function to create default folders with new names
CREATE OR REPLACE FUNCTION public.create_default_broll_folders()
RETURNS TRIGGER AS $$
BEGIN
  -- Create 5 default folders for the new brand
  INSERT INTO public.broll_folders (user_id, brand_id, name, is_default)
  VALUES
    (NEW.user_id, NEW.id, 'Hook', true),
    (NEW.user_id, NEW.id, 'CTA', true),
    (NEW.user_id, NEW.id, 'Usando el producto', true),
    (NEW.user_id, NEW.id, 'Social proof', true),
    (NEW.user_id, NEW.id, 'Uso diario', true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;