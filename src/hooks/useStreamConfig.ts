import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StreamConfig {
  id: string;
  user_id: string;
  platform: string;
  stream_url: string | null;
  stream_key: string | null;
  backup_url: string | null;
  title: string;
  category: string;
  privacy: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useStreamConfig() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<StreamConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<StreamConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConfigs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("stream_configs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const typed = (data ?? []) as unknown as StreamConfig[];
    setConfigs(typed);
    setActiveConfig(typed.find((c) => c.is_default) || typed[0] || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const saveConfig = useCallback(
    async (config: Partial<StreamConfig> & { id?: string }) => {
      if (!user) return null;
      if (config.id) {
        const { data } = await supabase
          .from("stream_configs")
          .update({ ...config, updated_at: new Date().toISOString() } as any)
          .eq("id", config.id)
          .select()
          .single();
        await fetchConfigs();
        return data as unknown as StreamConfig;
      } else {
        const { data } = await supabase
          .from("stream_configs")
          .insert({ ...config, user_id: user.id } as any)
          .select()
          .single();
        await fetchConfigs();
        return data as unknown as StreamConfig;
      }
    },
    [user, fetchConfigs]
  );

  const deleteConfig = useCallback(
    async (id: string) => {
      await supabase.from("stream_configs").delete().eq("id", id);
      await fetchConfigs();
    },
    [fetchConfigs]
  );

  return { configs, activeConfig, setActiveConfig, loading, saveConfig, deleteConfig, refetch: fetchConfigs };
}
