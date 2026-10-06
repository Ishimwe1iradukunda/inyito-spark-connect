import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SessionChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string;
  message: string;
  is_host: boolean;
  created_at: string;
}

const db = supabase as any; // table added after types were generated

export function useSessionChat(sessionId: string | null | undefined, asHost = false) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SessionChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName((data?.display_name || user.email?.split("@")[0] || "viewer").slice(0, 40)));
  }, [user]);

  useEffect(() => {
    setMessages([]);
    if (!sessionId) { setConnected(false); return; }
    let active = true;
    db.from("stream_chat_messages").select("*").eq("session_id", sessionId)
      .order("created_at", { ascending: true }).limit(200)
      .then(({ data }: { data: SessionChatMessage[] | null }) => { if (active && data) setMessages(data); });

    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stream_chat_messages", filter: `session_id=eq.${sessionId}` },
        (p) => setMessages((prev) => prev.some((m) => m.id === (p.new as SessionChatMessage).id) ? prev : [...prev.slice(-300), p.new as SessionChatMessage]))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "stream_chat_messages" },
        (p) => setMessages((prev) => prev.filter((m) => m.id !== (p.old as { id: string }).id)))
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => { active = false; supabase.removeChannel(channel); };
  }, [sessionId]);

  const send = useCallback(async (text: string) => {
    const message = text.trim().slice(0, 300);
    if (!message || !sessionId || !user) return { error: "Sign in to chat." };
    const { error } = await db.from("stream_chat_messages").insert({
      session_id: sessionId, user_id: user.id, display_name: displayName || "viewer", message, is_host: asHost,
    });
    return { error: error ? (error.code === "42501" ? "This broadcast has ended — chat is closed." : error.message) : null };
  }, [sessionId, user, displayName, asHost]);

  const remove = useCallback(async (id: string) => {
    await db.from("stream_chat_messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { messages, connected, send, remove, canSend: !!user, userId: user?.id };
}
