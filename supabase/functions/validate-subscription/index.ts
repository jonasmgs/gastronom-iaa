import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { GoogleAuth } from "npm:google-auth-library@9.14.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-jwt, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_PACKAGE = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? "app.vercel.gastronom_iaa.twa";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({})) as {
      purchaseToken?: string;
      subscriptionId?: string;
      packageName?: string;
    };

    const purchaseToken = body.purchaseToken?.trim();
    const subscriptionId = body.subscriptionId?.trim();
    const packageName = body.packageName?.trim() || DEFAULT_PACKAGE;

    if (!purchaseToken || !subscriptionId) {
      return new Response(JSON.stringify({ error: "purchaseToken e subscriptionId sao obrigatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credsJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
    if (!credsJson) {
      return new Response(JSON.stringify({ error: "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON nao configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = new GoogleAuth({
      credentials: JSON.parse(credsJson),
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const tokenValue = typeof accessToken === "string" ? accessToken : accessToken?.token;

    if (!tokenValue) {
      return new Response(JSON.stringify({ error: "Falha ao obter access token do Google" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tokenValue}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `Google API ${res.status}: ${text}` }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();

    const paymentState = data.paymentState ?? data.paymentStateEnum;
    const active = paymentState === 1 || paymentState === 2; // 1: payment received, 2: free trial
    const expiryTime = data.expiryTimeMillis ? Number(data.expiryTimeMillis) : null;
    const autoRenewing = Boolean(data.autoRenewing ?? data.autoRenewing);
    const cancelReason = data.cancelReason ?? null;

    return new Response(JSON.stringify({
      active,
      expiryTime,
      autoRenewing,
      cancelReason,
      orderId: data.orderId ?? null,
      userCancellationTime: data.userCancellationTimeMillis ?? null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
