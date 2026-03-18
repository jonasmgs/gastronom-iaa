import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não está configurada");
    if (!priceId) throw new Error("STRIPE_PRICE_ID não está configurada");

    logStep("Keys loaded", { priceId, keyPrefix: stripeKey.substring(0, 8) });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Usuário não autenticado");

    // Use ANON KEY for user token validation (not SERVICE_ROLE_KEY)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    logStep("Validating token", { tokenPrefix: token.substring(0, 20) });

    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Auth error details", { message: userError.message, status: (userError as any).status });
      throw new Error(`Falha ao autenticar: ${userError.message}`);
    }

    const user = data.user;
    if (!user?.email) throw new Error("Usuário sem e-mail");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    logStep("Customer lookup done", { hasCustomer: Boolean(customerId) });

    const origin = req.headers.get("origin") || "https://gastronom-iaa.lovable.app";

    logStep("Creating checkout session", { priceId, origin });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/sucesso`,
      cancel_url: `${origin}/planos`,
      metadata: { user_id: user.id },
    });

    logStep("Session created", { sessionId: session.id, url: session.url });

    if (!session.url) throw new Error("Stripe não retornou URL");

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
