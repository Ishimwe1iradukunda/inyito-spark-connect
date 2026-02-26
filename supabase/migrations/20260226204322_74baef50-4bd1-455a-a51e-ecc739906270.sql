
-- Templates table: stores both filter presets and video templates
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'filter_preset', -- 'filter_preset' | 'video_template'
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- e.g. 'cinematic', 'social', 'retro', 'minimal'
  thumbnail_url TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- stores filter values, transition config, overlays, etc.
  is_system BOOLEAN NOT NULL DEFAULT false, -- true for built-in templates
  user_id UUID, -- null for system templates
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view system templates
CREATE POLICY "Anyone can view system templates"
ON public.templates
FOR SELECT
USING (is_system = true);

-- Authenticated users can view their own custom templates
CREATE POLICY "Users can view own templates"
ON public.templates
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own templates
CREATE POLICY "Users can create own templates"
ON public.templates
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
ON public.templates
FOR UPDATE
USING (auth.uid() = user_id AND is_system = false);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
ON public.templates
FOR DELETE
USING (auth.uid() = user_id AND is_system = false);

-- Trigger for updated_at
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_templates_type ON public.templates(type);
CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_is_system ON public.templates(is_system);
