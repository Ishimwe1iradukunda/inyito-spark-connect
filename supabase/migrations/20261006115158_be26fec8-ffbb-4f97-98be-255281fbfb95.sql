CREATE TABLE public.stream_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  message text NOT NULL,
  is_host boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stream_chat_messages_session_idx ON public.stream_chat_messages(session_id, created_at);
GRANT SELECT ON public.stream_chat_messages TO anon;
GRANT SELECT, INSERT, DELETE ON public.stream_chat_messages TO authenticated;
GRANT ALL ON public.stream_chat_messages TO service_role;
ALTER TABLE public.stream_chat_messages ENABLE ROW LEVEL SECURITY;

-- Public view of a session (no destinations / stream keys)
CREATE OR REPLACE FUNCTION public.get_public_session(_id uuid)
RETURNS TABLE(id uuid, title text, status text, playback_url text, started_at timestamptz, ended_at timestamptz, host_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.title, s.status, s.playback_url, s.started_at, s.ended_at, s.user_id FROM public.live_sessions s WHERE s.id = _id
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_session(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.session_chat_open(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.live_sessions WHERE id = _id AND status <> 'ended')
$$;
REVOKE EXECUTE ON FUNCTION public.session_chat_open(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_chat_open(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_session_host(_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.live_sessions WHERE id = _id AND user_id = _uid)
$$;
REVOKE EXECUTE ON FUNCTION public.is_session_host(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_session_host(uuid, uuid) TO authenticated;

CREATE POLICY "Anyone can read stream chat" ON public.stream_chat_messages FOR SELECT USING (true);
CREATE POLICY "Signed-in users post to open streams" ON public.stream_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND char_length(message) BETWEEN 1 AND 300 AND char_length(display_name) BETWEEN 1 AND 40
    AND public.session_chat_open(session_id)
    AND (is_host = false OR public.is_session_host(session_id, auth.uid())));
CREATE POLICY "Host or author can delete messages" ON public.stream_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_session_host(session_id, auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_chat_messages;