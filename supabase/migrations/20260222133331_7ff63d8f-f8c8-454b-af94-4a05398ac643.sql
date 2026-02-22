
CREATE TABLE public.ai_provider_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id text NOT NULL,
  model_id text NOT NULL,
  api_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Only one settings row needed (single-user app)
CREATE UNIQUE INDEX idx_ai_provider_settings_single ON public.ai_provider_settings ((true));

ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai provider settings" ON public.ai_provider_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ai provider settings" ON public.ai_provider_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ai provider settings" ON public.ai_provider_settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete ai provider settings" ON public.ai_provider_settings FOR DELETE USING (true);
