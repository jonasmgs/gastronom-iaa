import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { method, action, subscription, userId } = await req.json();

    if (method === "subscribe") {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: userId,
          subscription: JSON.stringify(subscription),
          created_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        })
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "unsubscribe") {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "send" && action === "new_recipe") {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("subscription");

      const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
      const results = [];

      for (const sub of subs) {
        try {
          const subscription = JSON.parse(sub.subscription);
          
          await fetch(subscription.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "vapid t=" + Deno.env.get("VAPID_PRIVATE_KEY"),
            },
            body: JSON.stringify({
              title: "Nova Receita! 🍽️",
              body: "Sua nova receita foi gerada. Clique para ver!",
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              data: { url: "/recipes" },
            }),
          });
          
          results.push({ success: true, endpoint: subscription.endpoint });
        } catch (e) {
          results.push({ success: false, error: e.message });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid method" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
