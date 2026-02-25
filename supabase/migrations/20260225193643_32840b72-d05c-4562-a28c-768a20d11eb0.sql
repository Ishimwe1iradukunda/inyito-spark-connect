
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recordings table
CREATE TABLE public.recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Recording',
  description TEXT,
  file_url TEXT,
  file_size BIGINT,
  duration_ms INTEGER,
  source_type TEXT NOT NULL DEFAULT 'screen',
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recordings" ON public.recordings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recordings" ON public.recordings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recordings" ON public.recordings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recordings" ON public.recordings FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON public.recordings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', false);

CREATE POLICY "Users can upload own recordings" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own recordings" ON storage.objects FOR SELECT USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own recordings" ON storage.objects FOR DELETE USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
