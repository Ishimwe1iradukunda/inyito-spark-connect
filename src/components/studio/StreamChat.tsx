import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Users,
  Wifi,
  WifiOff,
  Settings,
  X,
  Hash,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  color: string;
  timestamp: Date;
  badges?: string[];
}

interface StreamChatProps {
  platform: string;
  channelName: string;
  isStreaming: boolean;
}

const CHAT_COLORS = [
  "hsl(0 72% 65%)",
  "hsl(24 94% 60%)",
  "hsl(45 93% 55%)",
  "hsl(142 71% 55%)",
  "hsl(195 80% 55%)",
  "hsl(213 94% 60%)",
  "hsl(264 80% 65%)",
  "hsl(330 80% 60%)",
];

/* ------------------------------------------------------------------ */
/*  Twitch IRC Chat Hook                                                */
/* ------------------------------------------------------------------ */

function useTwitchChat(channel: string, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !channel) {
      setConnected(false);
      return;
    }

    const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      ws.send("NICK justinfan" + Math.floor(Math.random() * 100000));
      ws.send(`JOIN #${channel.toLowerCase()}`);
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const raw = event.data as string;
      const lines = raw.split("\r\n").filter(Boolean);

      for (const line of lines) {
        if (line.startsWith("PING")) {
          ws.send("PONG :tmi.twitch.tv");
          continue;
        }

        const privmsgMatch = line.match(
          /;display-name=([^;]*);.*?;color=([^;]*)?;.*?PRIVMSG\s+#\S+\s+:(.+)/
        );
        if (privmsgMatch) {
          const [, displayName, color, message] = privmsgMatch;
          setMessages((prev) => [
            ...prev.slice(-200),
            {
              id: `${Date.now()}-${Math.random()}`,
              username: displayName || "anonymous",
              message,
              color: color || CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)],
              timestamp: new Date(),
            },
          ]);
        }
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [channel, enabled]);

  return { messages, connected, viewerCount };
}

/* ------------------------------------------------------------------ */
/*  Chat Component                                                      */
/* ------------------------------------------------------------------ */

const StreamChat = ({ platform, channelName, isStreaming }: StreamChatProps) => {
  const [inputChannel, setInputChannel] = useState(channelName || "");
  const [activeChannel, setActiveChannel] = useState("");
  const [showSettings, setShowSettings] = useState(!channelName);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isTwitch = platform === "twitch";
  const { messages, connected } = useTwitchChat(
    isTwitch ? activeChannel : "",
    isTwitch && !!activeChannel
  );

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleConnect = () => {
    if (inputChannel.trim()) {
      setActiveChannel(inputChannel.trim().toLowerCase());
      setShowSettings(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare size={12} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Stream Chat
          </span>
          {connected && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 border-green-500/40 text-green-500">
              <Wifi size={6} className="mr-0.5" /> Live
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowSettings(!showSettings)}>
          <Settings size={10} />
        </Button>
      </div>

      {/* Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 py-2 border-b border-border bg-muted/20 space-y-2"
          >
            <p className="text-[10px] text-muted-foreground">
              {isTwitch
                ? "Enter a Twitch channel name to view its chat:"
                : `Chat integration for ${platform} — enter channel/video ID:`}
            </p>
            <div className="flex gap-1.5">
              <div className="flex items-center gap-1 flex-1 bg-background border border-border rounded-md px-2">
                <Hash size={10} className="text-muted-foreground" />
                <Input
                  className="border-0 bg-transparent h-7 text-[10px] px-0 focus-visible:ring-0"
                  placeholder={isTwitch ? "channel_name" : "channel / video ID"}
                  value={inputChannel}
                  onChange={(e) => setInputChannel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                />
              </div>
              <Button size="sm" className="h-7 text-[10px] px-3" onClick={handleConnect}>
                Connect
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
        {!activeChannel ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2">
            <MessageSquare size={24} />
            <p className="text-[10px]">Connect to a channel to see chat</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2">
            <MessageSquare size={20} />
            <p className="text-[10px]">
              {connected ? "Waiting for messages..." : "Connecting..."}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-[10px] leading-tight">
              <span className="font-bold" style={{ color: msg.color }}>
                {msg.username}
              </span>
              <span className="text-muted-foreground">: </span>
              <span className="text-foreground">{msg.message}</span>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Info bar */}
      {connected && (
        <div className="px-3 py-1.5 border-t border-border bg-muted/20 flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Users size={8} /> {messages.length} messages
          </span>
          <span className="text-[9px] text-muted-foreground">
            #{activeChannel}
          </span>
        </div>
      )}
    </div>
  );
};

export default StreamChat;
