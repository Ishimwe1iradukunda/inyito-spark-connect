import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  transaction_id: z.union([z.string().min(1), z.number()]),
  tx_ref: z.string().min(1),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const transactionId = String(parsed.data.transaction_id);
    const txRef = parsed.data.tx_ref;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: record, error: fetchErr } = await supabase
      .from("payments")
      .select("*")
      .eq("tx_ref", txRef)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!record) {
      return new Response(JSON.stringify({ error: "Unknown transaction" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const payload = await res.json();
    const tx = payload?.data;

    const verified =
      payload?.status === "success" &&
      tx?.status === "successful" &&
      tx?.tx_ref === txRef &&
      Number(tx?.amount) >= Number(record.amount) &&
      String(tx?.currency) === String(record.currency);

    await supabase
      .from("payments")
      .update({
        transaction_id: transactionId,
        status: verified ? "successful" : (tx?.status ?? "failed"),
        payment_type: tx?.payment_type ?? null,
        raw_response: payload ?? null,
      })
      .eq("tx_ref", txRef);

    return new Response(
      JSON.stringify({
        verified,
        status: verified ? "successful" : (tx?.status ?? "failed"),
        transaction_id: transactionId,
        amount: record.amount,
        currency: record.currency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("verify-payment error", e);
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
