import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  amount: z.number().positive().max(10_000_000),
  currency: z.enum(["RWF", "UGX", "KES", "TZS", "USD"]).default("RWF"),
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  phone: z.string().min(6).max(20).optional(),
  description: z.string().max(255).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const publicKey = Deno.env.get("FLUTTERWAVE_PUBLIC_KEY");
    if (!publicKey) {
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
    const { amount, currency, email, name, phone, description } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Optional user association
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const txRef = `inyito-${crypto.randomUUID()}`;

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      tx_ref: txRef,
      amount,
      currency,
      status: "pending",
      customer_email: email,
      customer_name: name ?? null,
      customer_phone: phone ?? null,
    });
    if (error) throw error;

    return new Response(
      JSON.stringify({
        tx_ref: txRef,
        public_key: publicKey,
        amount,
        currency,
        description: description ?? "inyito.com payment",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-payment error", e);
    return new Response(JSON.stringify({ error: "Could not start payment" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
