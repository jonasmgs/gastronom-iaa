import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-jwt, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function getBearerToken(req: Request) {
  const customToken = req.headers.get("x-user-jwt");
  if (customToken) return `Bearer ${customToken}`;
  return req.headers.get("Authorization");
}

function buildSupabaseClient(bearer: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: bearer } } },
  );
}

function buildChunk(content: string) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function splitText(text: string) {
  return text
    .split(/(\s+)/)
    .filter(Boolean)
    .reduce<string[]>((chunks, part) => {
      const current = chunks[chunks.length - 1] ?? "";
      if (!current || current.length + part.length > 90) {
        chunks.push(part);
      } else {
        chunks[chunks.length - 1] = current + part;
      }
      return chunks;
    }, []);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bearer = getBearerToken(req);
    if (!bearer) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = buildSupabaseClient(bearer);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({})) as {
      messages?: ChatMessage[];
      recipe_context?: {
        name?: string;
        ingredients?: string;
        preparation?: string;
        calories?: number | string;
      };
    };

    const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
    const recipeContext = body.recipe_context ?? {};

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "Envie ao menos uma mensagem" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipeContext.name) {
      return new Response(JSON.stringify({ error: "Contexto da receita e obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const googleAiKey = Deno.env.get("GOOGLE_AI_KEY");
    if (!googleAiKey) {
      return new Response(JSON.stringify({ error: "GOOGLE_AI_KEY nao configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = [
      "Voce e o Gastronom.IA, um chef virtual especialista em gastronomia.",
      `A receita atual e: ${recipeContext.name}.`,
      `Ingredientes atuais: ${recipeContext.ingredients ?? "nao informados"}.`,
      `Modo de preparo atual: ${recipeContext.preparation ?? "nao informado"}.`,
      "Responda sempre em portugues do Brasil.",
      "REGRAS CRÍTICAS DE UNIDADES:",
      "1. NUNCA use as unidades 'unidade', 'un', 'fatia', 'dente', 'xícara', 'colher', 'pitada' ou qualquer medida subjetiva.",
      "2. Use SEMPRE E APENAS gramas (g), quilos (kg), mililitros (ml) ou litros (l) para quantidades.",
      "3. É PROIBIDO responder com '1 un' ou '2 unidades'. Se o usuário perguntar sobre um ovo, diga '50g de ovo'.",
      "4. EXEMPLO OBRIGATÓRIO (CORRETO VS INCORRETO):",
      "   - INCORRETO: 'Use 2 fatias de pão'",
      "   - CORRETO: 'Use 60g de pão (equivalente a 2 fatias)'",
      "   - INCORRETO: 'Adicione 1 xícara de açúcar'",
      "   - CORRETO: 'Adicione 200g de açúcar (equivalente a 1 xícara)'",
      "5. Converta TUDO para métrico (g ou ml). Você pode explicar a equivalência no texto, mas a medida principal deve ser métrica.",
      "Foque em duvidas sobre a receita atual, tecnicas culinarias, substituicoes de ingredientes e gastronomia.",
      "Se o usuario pedir substituicao de ingrediente, inclua no final uma linha no formato <<<SUBSTITUIR: ingrediente_original >>> ingrediente_novo>>> quando a troca fizer sentido. O ingrediente_novo deve seguir as regras de unidades métricas.",
      "Se a pergunta nao tiver relacao com culinaria ou com a receita, recuse de forma educada.",
      "Seja objetivo e util.",
    ].join(" ");

    const contents = messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleAiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Google AI error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Erro na IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    let answer = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!answer) {
      return new Response(JSON.stringify({ error: "A IA nao retornou resposta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Programmatic cleanup for substitutions in the chat
    if (answer.includes("<<<SUBSTITUIR:")) {
      const forbidden = ["unidade", "un", "xícara", "colher", "fatia", "dente"];
      forbidden.forEach(u => {
        if (answer.toLowerCase().includes(u)) {
          // Attempt to convert common units in substitutions too
          answer = answer.replace(/(\d+)\s*xícara/gi, "$1x200g");
          answer = answer.replace(/(\d+)\s*colher de sopa/gi, "$1x15g");
          answer = answer.replace(/(\d+)\s*unidade/gi, "$1x50g");
        }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of splitText(answer)) {
          controller.enqueue(encoder.encode(buildChunk(chunk)));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("chef-chat error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
