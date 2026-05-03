import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  createAdminClient,
  getAuthenticatedUser,
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

    const authHeader = req.headers.get("Authorization");
    const customToken = req.headers.get("x-user-jwt");
    const bearer = customToken ? `Bearer ${customToken}` : authHeader;
    if (!bearer) throw new Error("No authorization token");

    const user = await getAuthenticatedUser(req, logStep);
    
    // Admin client para bypass RLS se necessário
    const adminClient = createAdminClient(logStep);

    // Cliente do usuário para verificar permissões atuais
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: bearer } },
      },
    );

    // Verifica acesso de teste no perfil
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

    // TODO: Implementar integração com Google Play Billing / RevenueCat
    // Por enquanto, sem Stripe, usuários normais não têm assinatura ativa
    logStep("No active subscription (Stripe removed)");
    
    return new Response(JSON.stringify({
      subscribed: false,
      product_id: null,
      subscription_end: null,
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
