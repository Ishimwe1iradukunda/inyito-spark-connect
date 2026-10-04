import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";

const Body = z.object({
  title: z.string().max(200).optional(),
  durationSec: z.number().positive().max(60 * 60 * 12),
  frames: z.array(z.object({
    t: z.number().min(0),
    image: z.string().startsWith("data:image/").max(400_000),
  })).min(1).max(40),
  loudness: z.array(z.object({ t: z.number(), level: z.number() })).max(2000).optional(),
});

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "highlights"],
  properties: {
    summary: { type: "string" },
    highlights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["start", "end", "title", "description", "score"],
        properties: {
          start: { type: "number" },
          end: { type: "number" },
          title: { type: "string" },
          description: { type: "string" },
          score: { type: "number" },
        },
      },
    },
  },
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Please sign in to analyze broadcasts." }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { title, durationSec, frames, loudness } = parsed.data;

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured." }, 500);

    const peaks = (loudness ?? [])
      .slice().sort((a, b) => b.level - a.level).slice(0, 25)
      .sort((a, b) => a.t - b.t)
      .map((p) => `${p.t.toFixed(1)}s (${(p.level * 100).toFixed(0)}%)`).join(", ");

    const content: unknown[] = [{
      type: "input_text",
      text: `You are a pro stream editor. Broadcast "${title ?? "Untitled"}", length ${durationSec.toFixed(1)}s.
Below are sampled frames, each preceded by its timestamp. Loudest audio moments: ${peaks || "unknown"}.
Pick 3-8 of the most clip-worthy highlight moments (action, reactions, reveals, funny or emotional beats, loud spikes).
For each: start/end in seconds within 0..${durationSec.toFixed(1)} (clips 5-60s), a punchy title (max 6 words),
a concise description (max 25 words), and score 0-1 for highlight strength. Also give a one-sentence summary.`,
    }];
    for (const f of frames) {
      content.push({ type: "input_text", text: `Frame at ${f.t.toFixed(1)}s:` });
      content.push({ type: "input_image", image_url: f.image });
    }

    const upstream = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [{ role: "user", content }],
        reasoning: { effort: "low" },
        store: false,
        stream: true,
        text: { format: { type: "json_schema", name: "highlights", strict: true, schema } },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const details = await upstream.text();
      console.error(`Gateway failed [${upstream.status}]: ${details}`);
      const msg = upstream.status === 429 ? "Too many requests — try again in a minute."
        : upstream.status === 402 ? "AI credits are used up. Add credits to continue."
        : "AI analysis failed.";
      return json({ error: msg, status: upstream.status, details }, upstream.status);
    }

    // Consume SSE, accumulate output text
    const reader = upstream.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", failure: string | null = null;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const ev = JSON.parse(data);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          else if (ev.type === "response.refusal.delta") failure = "The AI declined to analyze this video.";
          else if (ev.type === "response.failed" || ev.type === "error") failure = ev.response?.error?.message ?? ev.message ?? "AI analysis failed.";
        } catch { /* ignore partial */ }
      }
    }
    if (failure) return json({ error: failure }, 502);
    if (!text) return json({ error: "The AI returned no result." }, 502);

    const result = JSON.parse(text);
    result.highlights = (result.highlights ?? [])
      .map((h: any) => ({ ...h, start: Math.max(0, Math.min(h.start, durationSec)), end: Math.max(0, Math.min(h.end, durationSec)) }))
      .filter((h: any) => h.end > h.start)
      .sort((a: any, b: any) => a.start - b.start);
    return json(result);
  } catch (e) {
    console.error("find-highlights error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
