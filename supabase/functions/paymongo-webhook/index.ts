import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function parseSignature(header: string) {
  const parts = header.split(",").map((part) => part.trim());
  const values: Record<string, string> = {};
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index > 0) values[part.slice(0, index)] = part.slice(index + 1);
  }
  return values;
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody: string, header: string, secret: string, liveMode: boolean) {
  const parsed = parseSignature(header);
  const timestamp = parsed.t;
  const provided = liveMode ? parsed.li : parsed.te;
  if (!timestamp || !provided) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  return timingSafeEqual(hex(signature), provided);
}

function findSupportIntentId(event: any) {
  const candidates = [
    event?.data?.attributes?.data?.attributes?.metadata?.support_intent_id,
    event?.data?.attributes?.data?.metadata?.support_intent_id,
    event?.data?.attributes?.metadata?.support_intent_id,
  ];
  return candidates.find((value) => typeof value === "string" && value) || null;
}

function findPaymentLinkId(event: any) {
  const candidates = [
    event?.data?.attributes?.data?.id,
    event?.data?.attributes?.data?.attributes?.payment_link_id,
    event?.data?.attributes?.data?.attributes?.link_id,
  ];
  return candidates.find((value) => typeof value === "string" && value) || null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const webhookSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Webhook service is not configured." }, 503);
  }

  const rawBody = await req.text();
  const signature = req.headers.get("Paymongo-Signature");
  if (!signature) return json({ error: "Missing signature." }, 401);

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid event." }, 400);
  }

  const eventType = event?.data?.attributes?.type;
  const liveMode = Boolean(event?.data?.attributes?.livemode);
  if (!(await verifySignature(rawBody, signature, webhookSecret, liveMode))) {
    return json({ error: "Invalid signature." }, 401);
  }

  if (eventType !== "link.payment.paid") {
    return json({ received: true, ignored: true });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const supportIntentId = findSupportIntentId(event);
  const paymentLinkId = findPaymentLinkId(event);

  if (!supportIntentId && !paymentLinkId) {
    return json({ received: true, ignored: true });
  }

  let query = adminClient
    .from("support_payments")
    .select("id,support_intent_id,provider_payment_link_id,status")
    .limit(1);

  if (supportIntentId) {
    query = query.eq("support_intent_id", supportIntentId);
  } else {
    query = query.eq("provider_payment_link_id", paymentLinkId);
  }

  const { data: payment } = await query.maybeSingle();
  if (!payment) return json({ received: true, ignored: true });

  if (payment.status !== "paid") {
    const { data: applied, error: applyError } = await adminClient.rpc("apply_verified_membership", {
      p_payment_id: payment.id,
    });

    if (applyError || applied !== true) {
      console.error("RP WORLD verified membership grant failed", applyError?.message);
      return json({ error: "Membership grant could not be completed." }, 500);
    }
  }

  return json({ received: true });
});
