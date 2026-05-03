import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function consumeAiCredit(supabaseClient: SupabaseClient, userId: string) {
  const { data, error } = await supabaseClient.rpc("consume_user_credit", {
    p_user_id: userId,
  });

  if (error) {
    const message = error.message?.includes("Limite")
      ? error.message
      : "Voce atingiu o seu limite de geracoes.";
    throw new Error(message);
  }

  return Array.isArray(data) ? data[0] : data;
}

export async function refundAiCredit(supabaseClient: SupabaseClient, userId: string) {
  const { error } = await supabaseClient.rpc("refund_user_credit", {
    p_user_id: userId,
  });

  if (error) {
    console.error("credit refund error:", error.message);
  }
}
