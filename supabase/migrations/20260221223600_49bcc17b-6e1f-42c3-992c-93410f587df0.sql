
-- جدول حفظ نتائج الفحوصات (الذاكرة الذكية)
CREATE TABLE public.scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  result TEXT NOT NULL,
  security_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scan results" ON public.scan_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scan results" ON public.scan_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete scan results" ON public.scan_results FOR DELETE USING (true);

CREATE INDEX idx_scan_results_target ON public.scan_results (target);
CREATE INDEX idx_scan_results_created ON public.scan_results (created_at DESC);

-- جدول المراقبة المستمرة
CREATE TABLE public.monitored_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target TEXT NOT NULL,
  interval_hours INTEGER NOT NULL DEFAULT 24,
  last_check TIMESTAMPTZ,
  last_score INTEGER,
  telegram_chat_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.monitored_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read monitored targets" ON public.monitored_targets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert monitored targets" ON public.monitored_targets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update monitored targets" ON public.monitored_targets FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete monitored targets" ON public.monitored_targets FOR DELETE USING (true);
