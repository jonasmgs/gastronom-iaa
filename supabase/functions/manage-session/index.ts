import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  createAdminClient,
  getAuthenticatedUser,
} from "../_shared/billing.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[MANAGE-SESSION] ${step}${suffix}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const user = await getAuthenticatedUser(req, logStep);
    const adminClient = createAdminClient(logStep);

    const body = await req.json();
    const { session_token } = body;

    if (!session_token) {
      throw new Error("session_token is required");
    }

    logStep("Updating session token", { userId: user.id, token: session_token });

    // Atualiza o session_token do usuário. Isso invalidará sessões anteriores
    // que tenham um token diferente armazenado no perfil.
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ session_token: session_token } as any)
      .eq("id", user.id);

    if (updateError) {
      logStep("Failed to update session token", { error: updateError.message });
      throw updateError;
    }

    logStep("Session token updated successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    logStep("Error encountered", { error: err.message });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
