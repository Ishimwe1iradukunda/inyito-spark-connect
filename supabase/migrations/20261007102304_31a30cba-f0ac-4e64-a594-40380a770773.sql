-- Trigger-only function: nobody should call it directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Public, key-free mirror of broadcasts for the viewer page
CREATE TABLE public.public_broadcasts (
  id uuid PRIMARY KEY REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz
);
GRANT SELECT ON public.public_broadcasts TO anon, authenticated;
GRANT ALL ON public.public_broadcasts TO service_role;
ALTER TABLE public.public_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view broadcast info" ON public.public_broadcasts FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION private.sync_public_broadcast()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.public_broadcasts (id, host_id, title, status, started_at, ended_at)
  VALUES (NEW.id, NEW.user_id, NEW.title, NEW.status, NEW.started_at, NEW.ended_at)
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status, ended_at = EXCLUDED.ended_at;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION private.sync_public_broadcast() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER sync_public_broadcast AFTER INSERT OR UPDATE ON public.live_sessions
FOR EACH ROW EXECUTE FUNCTION private.sync_public_broadcast();

INSERT INTO public.public_broadcasts (id, host_id, title, status, started_at, ended_at)
SELECT id, user_id, title, status, started_at, ended_at FROM public.live_sessions ON CONFLICT DO NOTHING;

DROP FUNCTION public.get_public_session(uuid);