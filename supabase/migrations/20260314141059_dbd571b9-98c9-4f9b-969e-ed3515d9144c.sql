
CREATE TABLE public.stream_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'youtube',
  stream_url TEXT,
  stream_key TEXT,
  backup_url TEXT,
  title TEXT NOT NULL DEFAULT 'Untitled Stream',
  category TEXT NOT NULL DEFAULT 'Entertainment',
  privacy TEXT NOT NULL DEFAULT 'public',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stream_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own stream configs"
  ON public.stream_configs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
