CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.session_chat_open(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.live_sessions WHERE id = _id AND status <> 'ended')
$$;
CREATE OR REPLACE FUNCTION private.is_session_host(_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.live_sessions WHERE id = _id AND user_id = _uid)
$$;
GRANT EXECUTE ON FUNCTION private.session_chat_open(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_session_host(uuid, uuid) TO authenticated;

DROP POLICY "Signed-in users post to open streams" ON public.stream_chat_messages;
DROP POLICY "Host or author can delete messages" ON public.stream_chat_messages;
CREATE POLICY "Signed-in users post to open streams" ON public.stream_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND char_length(message) BETWEEN 1 AND 300 AND char_length(display_name) BETWEEN 1 AND 40
    AND private.session_chat_open(session_id)
    AND (is_host = false OR private.is_session_host(session_id, auth.uid())));
CREATE POLICY "Host or author can delete messages" ON public.stream_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR private.is_session_host(session_id, auth.uid()));

DROP FUNCTION public.session_chat_open(uuid);
DROP FUNCTION public.is_session_host(uuid, uuid);