import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
      let query = supabase.from("templates").select("*").order("created_at", { ascending: true });
      if (type) query = query.eq("type", type);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TemplateRow[];
    },
  });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      category: string;
      type: string;
      config: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to save a template");
      const { data, error } = await supabase.from("templates").insert({
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        type: input.type,
        config: input.config,
        user_id: user.id,
        is_system: false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useTemplateCategories(templates: TemplateRow[]) {
  const categories = Array.from(new Set(templates.map((t) => t.category)));
  return ["all", ...categories];
}
