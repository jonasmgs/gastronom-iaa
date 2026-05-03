import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, isOriginAllowed, checkRateLimit } from "../_shared/config.ts";
import { consumeAiCredit, refundAiCredit } from "../_shared/credits.ts";
import {
  extractGoogleAiText,
  generateGoogleAiContent,
} from "../_shared/google-ai.ts";

const corsHeaders = getCorsHeaders(null);

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
  const origin = req.headers.get("origin");
  
  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: "Origem nao permitida" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const specificCorsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: specificCorsHeaders });
  }

  let creditConsumed = false;
  let creditUserId = "";
  let creditClient: ReturnType<typeof buildSupabaseClient> | null = null;

  try {
    const bearer = getBearerToken(req);
    if (!bearer) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = buildSupabaseClient(bearer);
    creditClient = supabaseClient;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: "Limite de requisicoes excedido. Tente novamente em alguns segundos.",
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }), {
        status: 429,
        headers: { 
          ...specificCorsHeaders, 
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
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
      language?: string;
    };

    const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
    const recipeContext = body.recipe_context ?? {};

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "Envie ao menos uma mensagem" }), {
        status: 400,
        headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipeContext.name) {
      return new Response(JSON.stringify({ error: "Contexto da receita e obrigatorio" }), {
        status: 400,
        headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
      });
    }

    await consumeAiCredit(supabaseClient, user.id);
    creditConsumed = true;
    creditUserId = user.id;

    const systemPrompt = [
      "Voce e o Gastronom.IA, um chef virtual especialista em gastronomia.",
      `A receita atual e: ${recipeContext.name}.`,
      `Ingredientes atuais: ${recipeContext.ingredients ?? "nao informados"}.`,
      `Modo de preparo atual: ${recipeContext.preparation ?? "nao informado"}.`,
      "Responda sempre em portugues do Brasil.",
      "Foque em duvidas sobre a receita atual, tecnicas culinarias, substituicoes de ingredientes e gastronomia.",
      "Se o usuario pedir substituicao de ingrediente, inclua no final uma linha no formato <<<SUBSTITUIR: ingrediente_original >>> ingrediente_novo>>> quando a troca fizer sentido.",
      "Se a pergunta nao tiver relacao com culinaria ou com a receita, recuse de forma educada.",
      body.language ? `Responda no idioma: ${body.language}.` : "Responda sempre em portugues do Brasil.",
      "Seja objetivo e util.",
    ].join(" ");

    const contents = messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    const { model, response: aiResponse } = await generateGoogleAiContent({
      contents,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Google AI error:", model, aiResponse.status, errorText);
      throw new Error("Erro na IA");
    }

    const data = await aiResponse.json() as Record<string, unknown>;
    const answer = extractGoogleAiText(data);

    if (!answer) {
      throw new Error("A IA nao retornou resposta");
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
        ...specificCorsHeaders,
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("chef-chat error:", message);
    if (creditConsumed && creditClient && creditUserId && !message.includes("Limite mensal")) {
      await refundAiCredit(creditClient, creditUserId);
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
    });
  }
});
