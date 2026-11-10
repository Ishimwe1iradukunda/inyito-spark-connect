import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { isOwnedBroadcastSession } from '../_shared/broadcastAccess.ts';

const CF_ACCOUNT = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
const CF_TOKEN = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const Destination = z.object({
  platform: z.string().trim().min(1).max(40).default('custom'),
  url: z.string().trim().min(1).max(500).refine((value) => {
    try {
      const url = new URL(value);
      return (url.protocol === 'rtmp:' || url.protocol === 'rtmps:') && Boolean(url.hostname);
    } catch {
      return false;
    }
  }, 'Use a valid RTMP or RTMPS destination URL.'),
  key: z.string().trim().min(1).max(500),
});

const StartBody = z.object({
  action: z.literal('start'),
  title: z.string().trim().min(1).max(120).default('Live session'),
  destinations: z.array(Destination).min(1, 'Add at least one ready destination.').max(8),
});

const SessionBody = z.object({
  action: z.enum(['status', 'stop']),
  sessionId: z.string().uuid('A valid broadcast session is required.'),
});

type DestinationInput = z.infer<typeof Destination>;

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
    throw new Error(`Streaming relay rejected the request [${res.status}]: ${detail}`);
  }
  return parsed?.result;
}

async function deleteRelayInput(uid: string) {
  try {
    await cf(`/live_inputs/${uid}`, { method: 'DELETE' });
  } catch (e) {
    console.error('Failed to clean up live input', (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST for broadcast controls.' }, 405);

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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'A valid JSON request is required.' }, 400);
    const action = String((body as Record<string, unknown>).action ?? '');

    /* ---------------- start ---------------- */
    if (action === 'start') {
      const parsed = StartBody.safeParse(body);
      if (!parsed.success) {
        return json({ error: parsed.error.issues[0]?.message ?? 'Check the broadcast details.' }, 400);
      }
      const { title, destinations } = parsed.data;

      const input = await cf('/live_inputs', {
        method: 'POST',
        body: JSON.stringify({
          meta: { name: `${title} — ${user.id.slice(0, 8)}` },
          recording: { mode: 'off' },
        }),
      });

      const outputs: { platform: string; ok: boolean; error?: string }[] = [];
      for (const d of destinations as DestinationInput[]) {
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

      if (!outputs.some((output) => output.ok)) {
        await deleteRelayInput(input.uid);
        return json({
          error: 'None of your destinations could be configured. Check each server URL and stream key.',
          outputs,
        }, 502);
      }

      const { data: session, error: sessionError } = await supabase
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

      if (sessionError || !session) {
        await deleteRelayInput(input.uid);
        console.error('Failed to store broadcast session', sessionError?.message);
        return json({ error: 'The relay was created, but the broadcast could not be saved. Please try again.' }, 500);
      }

      return json({
        sessionId: session.id,
        liveInputUid: input.uid,
        whipUrl: input.webRTC?.url,
        playbackUrl: input.webRTCPlayback?.url ?? null,
        outputs,
      });
    }

    /* ---------------- owned session controls ---------------- */
    if (action === 'status' || action === 'stop') {
      const parsed = SessionBody.safeParse(body);
      if (!parsed.success) {
        return json({ error: parsed.error.issues[0]?.message ?? 'A valid broadcast session is required.' }, 400);
      }
      const { sessionId } = parsed.data;
      const { data: session, error: sessionError } = await supabase
        .from('live_sessions')
        .select('id,user_id,live_input_uid,status')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (sessionError) {
        console.error('Failed to load broadcast session', sessionError.message);
        return json({ error: 'Could not load this broadcast session.' }, 500);
      }
      if (!isOwnedBroadcastSession(session, user.id)) {
        return json({ error: 'Broadcast session not found.' }, 404);
      }
      if (!session.live_input_uid) return json({ error: 'This broadcast has no relay input.' }, 409);

      if (action === 'status') {
        if (session.status === 'ended') return json({ state: 'ended', reason: null });
        const input = await cf(`/live_inputs/${session.live_input_uid}`);
        const state = input?.status?.current?.state ?? 'idle';
        const { error: updateError } = await supabase
          .from('live_sessions')
          .update({ status: state })
          .eq('id', session.id)
          .eq('user_id', user.id);
        if (updateError) {
          console.error('Failed to save provider status', updateError.message);
          return json({ error: 'Could not save the latest broadcast status.' }, 500);
        }
        return json({ state, reason: input?.status?.current?.reason ?? null });
      }

      await deleteRelayInput(session.live_input_uid);
      const { error: updateError } = await supabase
        .from('live_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', session.id)
        .eq('user_id', user.id);
      if (updateError) {
        console.error('Failed to end broadcast session', updateError.message);
        return json({ error: 'The relay stopped, but the broadcast history could not be updated.' }, 500);
      }
      return json({ ok: true });
    }

    return json({ error: 'Unknown broadcast action.' }, 400);
  } catch (e) {
    const message = (e as Error).message ?? 'Unexpected error';
    console.error('live-stream error:', message);
    return json({ error: message }, 500);
  }
});
