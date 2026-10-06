import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Trash2, Crown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionChat } from "@/hooks/useSessionChat";
import { toast } from "@/hooks/use-toast";

interface Props { sessionId: string | null | undefined; asHost?: boolean; compact?: boolean }

const SessionChatPanel = ({ sessionId, asHost = false, compact = false }: Props) => {
  const { messages, connected, send, remove, canSend, userId } = useSessionChat(sessionId, asHost);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const { error } = await send(text);
    setSending(false);
    if (error) toast({ title: "Message not sent", description: error, variant: "destructive" });
    else setText("");
  };

  const sz = compact ? "text-[11px]" : "text-sm";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5">
        {!sessionId ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground/60">
            <MessageSquare size={22} />
            <p className="text-[11px]">Go live to open your chat room. Viewers join with your share link.</p>
          </div>
        ) : messages.length === 0 ? (
          <p className="pt-6 text-center text-[11px] text-muted-foreground">{connected ? "No messages yet — say hi!" : "Connecting…"}</p>
        ) : messages.map((m) => (
          <div key={m.id} className={`group flex items-start gap-1.5 leading-snug ${sz}`}>
            <div className="flex-1 min-w-0">
              {m.is_host && <Crown size={11} className="mr-1 inline text-primary" />}
              <span className={`font-bold ${m.is_host ? "text-primary" : "text-accent-foreground"}`}>{m.display_name}</span>
              <span className="text-muted-foreground">: </span>
              <span className="break-words text-foreground">{m.message}</span>
            </div>
            {(asHost || m.user_id === userId) && (
              <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" aria-label="Delete message">
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {sessionId && (
        <div className="border-t border-border p-2">
          {canSend ? (
            <div className="flex gap-1.5">
              <Input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={asHost ? "Chat as host…" : "Send a message…"} className={compact ? "h-7 text-[11px]" : ""} />
              <Button size={compact ? "sm" : "default"} className={compact ? "h-7 px-2" : ""} onClick={submit} disabled={sending || !text.trim()} aria-label="Send">
                <Send size={compact ? 12 : 16} />
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline" className="w-full"><Link to="/auth">Sign in to chat</Link></Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionChatPanel;
