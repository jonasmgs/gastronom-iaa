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

function buildSseChunk(content: string) {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content } }],
  })}\n\n`;
}

function splitIntoChunks(text: string) {
  return text
    .split(/(\s+)/)
    .filter(Boolean)
    .reduce<string[]>((chunks, piece) => {
      const current = chunks[chunks.length - 1] ?? "";
      if (!current || current.length + piece.length > 80) {
        chunks.push(piece);
      } else {
        chunks[chunks.length - 1] = current + piece;
      }
      return chunks;
    }, []);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const customToken = req.headers.get("x-user-jwt");
    const bearer = customToken ? `Bearer ${customToken}` : authHeader;
    if (!bearer) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: bearer } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, recipe_context } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Envie ao menos uma mensagem" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipe_context || !recipe_context.name) {
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

    const systemPrompt = `Voce e o Gastronom.IA, um chef virtual especialista em gastronomia. Voce esta ajudando o usuario com uma receita especifica.

RECEITA ATUAL:
- Nome: ${recipe_context.name}
- Ingredientes: ${recipe_context.ingredients || "nao informados"}
- Modo de Preparo: ${recipe_context.preparation || "nao informado"}
- Calorias: ${recipe_context.calories || "nao informado"} kcal

REGRAS ABSOLUTAS:
1. Voce SOMENTE pode responder perguntas relacionadas a:
   - Esta receita especifica (${recipe_context.name})
   - Substituicoes de ingredientes DESTA receita
   - Tecnicas culinarias usadas NESTA receita
   - Dicas para melhorar ESTA receita
   - Informacoes nutricionais DESTA receita
   - Variacoes e adaptacoes DESTA receita
   - Perguntas gerais sobre gastronomia e culinaria

2. Se o usuario perguntar sobre QUALQUER assunto que NAO seja relacionado a esta receita ou gastronomia (por exemplo: fazer papel, programacao, matematica, historia nao-culinaria, etc.), voce DEVE responder EXATAMENTE:
   "Opa! Sou o Gastronom.IA e so posso te ajudar com assuntos relacionados a receita de ${recipe_context.name} e gastronomia em geral! Me pergunta algo sobre o prato ou culinaria que eu te ajudo!"

3. Nao tente interpretar palavras ambiguas como receitas ou alimentos. Se alguem pedir "papel", "caneta", "carro", ou qualquer coisa claramente nao-culinaria, recuse educadamente.
4. Sempre responda em portugues brasileiro.
5. Use emojis de comida ocasionalmente.
6. Seja conciso mas informativo.

SUBSTITUICAO DE INGREDIENTES:
Quando o usuario pedir para trocar/substituir um ingrediente desta receita:
- O novo ingrediente DEVE ser comestivel. Se nao for comestivel, recuse e explique.
- Avalie se a combinacao fica boa. Se nao ficar ideal, aceite a troca mas de uma dica de como melhorar.
- SEMPRE inclua no final da sua resposta uma linha especial no formato exato:
  <<<SUBSTITUIR: ingrediente_original >>> ingrediente_novo>>>
- Use o nome exato do ingrediente original como aparece na lista de ingredientes da receita.
- Inclua APENAS UMA substituicao por mensagem.
- Se a combinacao for ruim, ainda faca a substituicao mas avise o usuario com uma dica.
- Se o ingrediente solicitado NAO for comestivel (ex: papel, plastico, madeira), NAO faca a substituicao e avise que so aceita ingredientes comestiveis.`;

    const recentMessages = (messages as ChatMessage[]).slice(-10);
    const contents = recentMessages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${googleAiKey}`,
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
      const errText = await aiResponse.text();
      console.error("Google AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro na API de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const answer = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!answer) {
      return new Response(JSON.stringify({ error: "A IA nao retornou resposta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of splitIntoChunks(answer)) {
          controller.enqueue(encoder.encode(buildSseChunk(chunk)));
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
  } catch (err) {
    console.error("chef-chat error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
