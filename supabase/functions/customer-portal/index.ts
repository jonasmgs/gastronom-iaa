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
  console.log(`[CUSTOMER-PORTAL] ${step}${suffix}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const user = await getAuthenticatedUser(req, logStep);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const adminClient = createAdminClient(logStep);
    const customerId = await getOrCreateStripeCustomerId({
      adminClient,
      stripe,
      user,
      logStep,
    });

    if (!customerId) throw new Error("No Stripe customer found");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getOrigin(req)}/settings`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
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
