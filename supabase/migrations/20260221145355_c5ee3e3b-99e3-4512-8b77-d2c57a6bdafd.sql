
CREATE TABLE public.custom_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🔧',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'scanning' CHECK (category IN ('scanning', 'offensive', 'defensive')),
  args JSONB NOT NULL DEFAULT '[]',
  execution_type TEXT NOT NULL DEFAULT 'http_fetch' CHECK (execution_type IN ('http_fetch', 'dns_query', 'tcp_connect', 'custom_script')),
  execution_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Public read access (tools are shared)
ALTER TABLE public.custom_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read custom tools"
  ON public.custom_tools FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert custom tools"
  ON public.custom_tools FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete custom tools"
  ON public.custom_tools FOR DELETE
  USING (true);

CREATE POLICY "Anyone can update custom tools"
  ON public.custom_tools FOR UPDATE
  USING (true);
