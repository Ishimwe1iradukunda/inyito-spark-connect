import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CF_ACCOUNT = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
const CF_TOKEN = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface Destination {
  platform: string;
  url: string;
  key: string;
}

async function cf(path: string, init: RequestInit = {}) {
  const res = await fetch(`${CF_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  if (!res.ok || (parsed && parsed.success === false)) {
    const detail = parsed?.errors?.map((e: any) => e.message).join('; ') || text;
    console.error(`Cloudflare Stream ${path} failed [${res.status}]: ${detail}`);
    throw new Error(`[${res.status}] ${detail}`);
  }
  return parsed?.result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!CF_ACCOUNT || !CF_TOKEN) {
      return json({ error: 'Streaming relay is not configured (missing Cloudflare credentials).' }, 500);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return json({ error: 'You must be signed in to go live.' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    /* ---------------- start ---------------- */
    if (action === 'start') {
      const title = String(body.title ?? 'Live session').slice(0, 120);
      const destinations: Destination[] = Array.isArray(body.destinations)
        ? body.destinations
            .filter((d: any) => d && typeof d.url === 'string' && typeof d.key === 'string' && d.url && d.key)
            .slice(0, 8)
            .map((d: any) => ({ platform: String(d.platform ?? 'custom'), url: String(d.url), key: String(d.key) }))
        : [];

      if (destinations.length === 0) {
        return json({ error: 'Add at least one destination with a server URL and stream key.' }, 400);
      }

      const input = await cf('/live_inputs', {
        method: 'POST',
        body: JSON.stringify({
          meta: { name: `${title} — ${user.id.slice(0, 8)}` },
          recording: { mode: 'off' },
        }),
      });

      const outputs: { platform: string; ok: boolean; error?: string }[] = [];
      for (const d of destinations) {
        try {
          await cf(`/live_inputs/${input.uid}/outputs`, {
            method: 'POST',
            body: JSON.stringify({ url: d.url, streamKey: d.key, enabled: true }),
          });
          outputs.push({ platform: d.platform, ok: true });
        } catch (e) {
          outputs.push({ platform: d.platform, ok: false, error: (e as Error).message });
        }
      }

      const { data: session } = await supabase
        .from('live_sessions')
        .insert({
          user_id: user.id,
          title,
          live_input_uid: input.uid,
          playback_url: input.webRTCPlayback?.url ?? null,
          destinations: outputs,
          status: 'connecting',
        })
        .select()
        .single();

      return json({
        sessionId: session?.id ?? null,
        liveInputUid: input.uid,
        whipUrl: input.webRTC?.url,
        playbackUrl: input.webRTCPlayback?.url ?? null,
        outputs,
      });
    }

    /* ---------------- status ---------------- */
    if (action === 'status') {
      const uid = String(body.liveInputUid ?? '');
      if (!uid) return json({ error: 'Missing live input id.' }, 400);
      const input = await cf(`/live_inputs/${uid}`);
      const state = input?.status?.current?.state ?? 'idle';
      if (body.sessionId) {
        await supabase.from('live_sessions').update({ status: state }).eq('id', body.sessionId).eq('user_id', user.id);
      }
      return json({ state, reason: input?.status?.current?.reason ?? null });
    }

    /* ---------------- stop ---------------- */
    if (action === 'stop') {
      const uid = String(body.liveInputUid ?? '');
      if (uid) {
        try { await cf(`/live_inputs/${uid}`, { method: 'DELETE' }); } catch (e) {
          console.error('Failed to delete live input', (e as Error).message);
        }
      }
      if (body.sessionId) {
        await supabase
          .from('live_sessions')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', body.sessionId)
          .eq('user_id', user.id);
      }
      return json({ ok: true });
    }

    return json({ error: `Unknown action "${action}".` }, 400);
  } catch (e) {
    const message = (e as Error).message ?? 'Unexpected error';
    console.error('live-stream error:', message);
    return json({ error: message }, 500);
  }
});
