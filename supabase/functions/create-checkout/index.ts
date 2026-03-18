import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  corsHeaders,
  createAdminClient,
  getAuthenticatedUser,
  getOrCreateStripeCustomerId,
  getOrigin,
} from "../_shared/billing.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${suffix}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_PRICE_ID");
    const { embedded = false } = await req.json().catch(() => ({}));

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY nao esta configurada");
    if (!priceId) throw new Error("STRIPE_PRICE_ID nao esta configurada");

    logStep("Keys loaded", {
      priceId,
      keyPrefix: stripeKey.substring(0, 8),
      embedded,
    });

    const user = await getAuthenticatedUser(req, logStep);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const adminClient = createAdminClient(logStep);
    const customerId = await getOrCreateStripeCustomerId({
      adminClient,
      stripe,
      user,
      createIfMissing: true,
      logStep,
    });
    const origin = getOrigin(req);

    const baseSession = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      metadata: { user_id: user.id },
    } as const;

    logStep("Creating checkout session", { priceId, origin, embedded });

    const session = embedded
      ? await stripe.checkout.sessions.create({
          ...baseSession,
          ui_mode: "embedded",
          redirect_on_completion: "if_required",
          return_url: `${origin}/settings?checkout=success`,
        })
      : await stripe.checkout.sessions.create({
          ...baseSession,
          success_url: `${origin}/sucesso`,
          cancel_url: `${origin}/planos`,
        });

    logStep("Session created", {
      sessionId: session.id,
      hasUrl: Boolean(session.url),
      hasClientSecret: Boolean(session.client_secret),
    });

    if (embedded) {
      if (!session.client_secret) {
        throw new Error("Stripe nao retornou client secret");
      }

      return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!session.url) throw new Error("Stripe nao retornou URL");

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
