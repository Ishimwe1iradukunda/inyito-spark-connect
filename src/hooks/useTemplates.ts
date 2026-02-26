import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TemplateRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  config: any;
  is_system: boolean;
  user_id: string | null;
  created_at: string;
}

export function useTemplates(type?: string) {
  return useQuery({
    queryKey: ["templates", type],
    queryFn: async () => {
      let query = supabase.from("templates" as any).select("*").order("created_at", { ascending: true });
      if (type) query = query.eq("type", type);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as TemplateRow[];
    },
  });
}

export function useTemplateCategories(templates: TemplateRow[]) {
  const categories = Array.from(new Set(templates.map((t) => t.category)));
  return ["all", ...categories];
}
