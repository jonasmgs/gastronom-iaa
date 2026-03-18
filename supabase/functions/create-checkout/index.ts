import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
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
    if (!stripeKey.startsWith("sk_live_")) {
      throw new Error("Stripe está em modo de teste. Configure uma chave live (sk_live_...).");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Usuário não autenticado");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Falha ao autenticar usuário: ${userError.message}`);

    const user = data.user;
    if (!user?.email) throw new Error("Usuário autenticado sem e-mail");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const price = await stripe.prices.retrieve(priceId);

    if ("deleted" in price && price.deleted) {
      throw new Error("STRIPE_PRICE_ID inválido");
    }
    if (!price.active) throw new Error("O preço configurado no Stripe está inativo");
    if (!price.livemode) {
      throw new Error("O preço configurado está em modo de teste. Use um price live.");
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    const origin = req.headers.get("origin")?.replace(/\/$/, "")
      || new URL(req.headers.get("referer") || "https://gastronom-iaa.lovable.app").origin;

    logStep("Stripe checkout config ready", {
      hasCustomer: Boolean(customerId),
      priceId,
      origin,
      livemode: price.livemode,
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/sucesso`,
      cancel_url: `${origin}/planos`,
    });

    if (!session.url) throw new Error("Stripe não retornou a URL do checkout");

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
