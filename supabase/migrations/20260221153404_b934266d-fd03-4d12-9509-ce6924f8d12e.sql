
-- Create table for dynamic telegram bot commands
CREATE TABLE public.telegram_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  command TEXT NOT NULL UNIQUE,
  response TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_commands ENABLE ROW LEVEL SECURITY;

-- Public access (no auth needed for this bot config)
CREATE POLICY "Anyone can read telegram commands" ON public.telegram_commands FOR SELECT USING (true);
CREATE POLICY "Anyone can insert telegram commands" ON public.telegram_commands FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update telegram commands" ON public.telegram_commands FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete telegram commands" ON public.telegram_commands FOR DELETE USING (true);
