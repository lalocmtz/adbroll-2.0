-- Add missing UPDATE policy for video_analyses
CREATE POLICY "Users can update own analyses"
ON public.video_analyses
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);