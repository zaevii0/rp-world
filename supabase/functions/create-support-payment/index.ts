import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const paymongoSecret = Deno.env.get("PAYMONGO_SECRET_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !paymongoSecret) {
    return json({ error: "Payment service is not configured." }, 503);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Authentication required." }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Authentication required." }, 401);

  let body: { support_intent_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const intentId = String(body.support_intent_id || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(intentId)) return json({ error: "Invalid support request." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: intent, error: intentError } = await adminClient
    .from("support_intents")
    .select("id,user_id,amount,currency,frequency,note,status,provider,provider_reference,plan_code")
    .eq("id", intentId)
    .eq("user_id", authData.user.id)
    .single();

  if (intentError || !intent) return json({ error: "Support request not found." }, 404);
  const planPrices: Record<string, number> = {
    verified_2w: 50,
    verified_1m: 100,
    verified_3m_themes: 250,
  };
  const planPrice = planPrices[intent.plan_code];
  if (intent.plan_code !== "support" && (!planPrice || Number(intent.amount) !== planPrice || intent.frequency !== "one_time")) {
    return json({ error: "Invalid verified membership plan." }, 400);
  }
  if (intent.plan_code === "support" && intent.frequency !== "one_time") {
    return json({ error: "Automatic monthly support is not enabled yet. Please choose one-time support." }, 400);
  }
  if (intent.status === "paid") return json({ error: "This support request is already marked as paid." }, 409);
  if (intent.status !== "pending") return json({ error: "This support request is no longer payable." }, 409);

  const { data: existing } = await adminClient
    .from("support_payments")
    .select("id,checkout_url,provider_payment_link_id,status")
    .eq("support_intent_id", intent.id)
    .maybeSingle();

  if (existing?.checkout_url && existing.status === "pending") {
    return json({ checkout_url: existing.checkout_url, payment_id: existing.id, reused: true });
  }

  const amount = Math.round(Number(intent.amount) * 100);
  if (!Number.isFinite(amount) || amount < 100 || amount > 999999999) {
    return json({ error: "Invalid support amount." }, 400);
  }

  const basicAuth = btoa(`${paymongoSecret}:`);
  const response = await fetch("https://api.paymongo.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `rpworld-support-${intent.id}`,
    },
    body: JSON.stringify({
      amount,
      currency: "PHP",
      description: intent.plan_code === "verified_2w" ? "RP WORLD Verified — 2 weeks" : intent.plan_code === "verified_1m" ? "RP WORLD Verified — 1 month" : intent.plan_code === "verified_3m_themes" ? "RP WORLD Verified + All Themes — 3 months" : "Support RP WORLD",
      remarks: `RP WORLD ${intent.plan_code} ${intent.id}`,
      metadata: {
        support_intent_id: intent.id,
        rp_world_user_id: authData.user.id,
        plan_code: intent.plan_code,
      },
      restriction: {
        completed_sessions: { limit: 1 },
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data?.id || !payload?.data?.url) {
    console.error("PayMongo payment link creation failed", response.status);
    return json({ error: "Payment checkout could not be created. Please try again." }, 502);
  }

  const link = payload.data;
  const { data: payment, error: paymentError } = await adminClient
    .from("support_payments")
    .upsert({
      support_intent_id: intent.id,
      user_id: authData.user.id,
      provider: "paymongo",
      provider_payment_link_id: link.id,
      checkout_url: link.url,
      provider_reference: link.reference_number || null,
      amount: Number(intent.amount),
      currency: "PHP",
      status: "pending",
      updated_at: new Date().toISOString(),
    }, { onConflict: "support_intent_id" })
    .select("id,checkout_url,status")
    .single();

  if (paymentError || !payment) {
    console.error("RP WORLD support payment record failed", paymentError?.message);
    return json({ error: "Checkout was created but could not be recorded. Please contact RP WORLD support before paying again." }, 500);
  }

  await adminClient
    .from("support_intents")
    .update({
      provider: "paymongo",
      provider_reference: link.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intent.id);

  return json({
    checkout_url: payment.checkout_url,
    payment_id: payment.id,
    reused: false,
  });
});
