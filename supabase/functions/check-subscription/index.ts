import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  createAdminClient,
  getAuthenticatedUser,
  getOrCreateStripeCustomerId,
} from "../_shared/billing.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${suffix}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const user = await getAuthenticatedUser(req, logStep);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const adminClient = createAdminClient(logStep);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      },
    );

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("test_access")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logStep("Profile test access lookup failed", { message: profileError.message });
    } else if (profile?.test_access) {
      logStep("Returning test access subscription", { userId: user.id });
      return new Response(JSON.stringify({
        subscribed: true,
        product_id: "test-access",
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = await getOrCreateStripeCustomerId({
      adminClient,
      stripe,
      user,
      logStep,
    });

    if (!customerId) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;
    let productId = null;

    if (hasActiveSub) {
      const sub = subscriptions.data[0];
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      productId = sub.items.data[0].price.product;
      logStep("Active subscription", { productId, subscriptionEnd });
    } else {
      logStep("No active subscription");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
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
