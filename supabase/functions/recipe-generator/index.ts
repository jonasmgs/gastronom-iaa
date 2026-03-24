import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-jwt, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

function sanitizeInput(input: string): string {
  return input
    .slice(0, 200)
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

type Ingredient = {
  name: string;
  quantity: string;
  calories: number;
  tip: string;
};

type Step = {
  step_number: number;
  title: string;
  description: string;
  duration: string;
  tip: string;
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

function sanitizeItems(items: unknown) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 100)
    .slice(0, 20);
}

function parseJsonPayload(raw: string) {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object returned by model");
  }

  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function normalizeIngredients(value: unknown): Ingredient[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = typeof item === "object" && item ? item as Record<string, unknown> : {};
      let quantity = String(record.quantity ?? "").trim().toLowerCase();
      let tip = String(record.tip ?? "").trim();

      // Programmatic cleanup for non-metric units (aggressive)
      const forbiddenUnits = [
        "unidade", "unidades", " un", "un ", "un.", "fatia", "fatias", 
        "dente", "dentes", "xícara", "xícaras", "colher", "colheres", 
        "pitada", "maço", "maços", "unid", "meia", "meio", "inteiro", "inteira"
      ];

      const hasForbidden = forbiddenUnits.some(unit => quantity.includes(unit)) || 
                          (!quantity.includes("g") && !quantity.includes("kg") && 
                           !quantity.includes("ml") && !quantity.includes("l"));
      
      if (hasForbidden) {
        if (!tip) tip = `Original: ${quantity}`;
        
        // Handle fractions like 1/2 or 1/4
        let num = 0;
        const fractionMatch = quantity.match(/(\d+)\/(\d+)/);
        if (fractionMatch) {
          num = parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
        } else {
          const numMatch = quantity.match(/(\d+([.,]\d+)?)/);
          if (numMatch) {
            num = parseFloat(numMatch[1].replace(',', '.'));
          } else if (quantity.includes("meia") || quantity.includes("meio") || quantity.includes("metade")) {
            num = 0.5;
          } else {
            num = 1;
          }
        }

        // Hard conversion map to ensure metric units
        if (quantity.includes("ovo")) quantity = `${Math.round(num * 50)}g`;
        else if (quantity.includes("alho")) quantity = `${Math.round(num * 5)}g`;
        else if (quantity.includes("cebola")) quantity = `${Math.round(num * 150)}g`;
        else if (quantity.includes("xícara") || quantity.includes("copo")) quantity = `${Math.round(num * 200)}g`;
        else if (quantity.includes("colher de sopa")) quantity = `${Math.round(num * 15)}g`;
        else if (quantity.includes("colher de chá")) quantity = `${Math.round(num * 5)}g`;
        else if (quantity.includes("fatia")) quantity = `${Math.round(num * 30)}g`;
        else if (quantity.includes("pitada")) quantity = `1g`;
        else if (quantity.includes("maço")) quantity = `100g`;
        else {
          // If we don't know the density, we assume it's roughly 100g/unit
          quantity = `${Math.round(num * 100)}g`;
        }
      }

      return {
        name: String(record.name ?? "").trim(),
        quantity: quantity,
        calories: Number(record.calories ?? 0) || 0,
        tip: tip,
      };
    })
    .filter((item) => item.name.length > 0);
}

function normalizeSteps(value: unknown): Step[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const record = typeof item === "object" && item ? item as Record<string, unknown> : {};
      return {
        step_number: Number(record.step_number ?? index + 1) || index + 1,
        title: String(record.title ?? `Passo ${index + 1}`).trim(),
        description: String(record.description ?? "").trim(),
        duration: String(record.duration ?? "").trim(),
        tip: String(record.tip ?? "").trim(),
      };
    })
    .filter((item) => item.description.length > 0);
}

function normalizeRecipe(recipe: Record<string, unknown>) {
  const ingredients = normalizeIngredients(recipe.ingredients);
  const steps = normalizeSteps(recipe.steps);

  if (ingredients.length === 0 || steps.length === 0) {
    throw new Error("Model returned an incomplete recipe");
  }

  return {
    recipe_name: String(recipe.recipe_name ?? "Receita Gastronom.IA").trim(),
    difficulty: String(recipe.difficulty ?? "Medio").trim(),
    prep_time: String(recipe.prep_time ?? "15 min").trim(),
    cook_time: String(recipe.cook_time ?? "20 min").trim(),
    servings: Number(recipe.servings ?? 2) || 2,
    dietary_tags: Array.isArray(recipe.dietary_tags)
      ? recipe.dietary_tags.map((tag) => String(tag)).filter(Boolean)
      : [],
    ingredients,
    steps,
    calories_total: Number(recipe.calories_total ?? 0) || 0,
    nutrition_info: String(recipe.nutrition_info ?? "").trim(),
    chef_tips: String(recipe.chef_tips ?? "").trim(),
    substitutions_made: String(recipe.substitutions_made ?? "").trim(),
  };
}

function buildPrompt(body: Record<string, unknown>, ingredients: string[]) {
  const mode = body.mode === "transform" ? "transform" : "generate";
  const servings = typeof body.servings === "number" ? Math.min(Math.max(body.servings, 1), 20) : 2;
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const complexity = typeof body.complexity === "string" ? body.complexity.trim() : "";
  const filters = typeof body.filters === "object" && body.filters ? body.filters as Record<string, unknown> : {};
  const existingRecipe = typeof body.existing_recipe === "string" ? body.existing_recipe.trim().slice(0, 5000) : "";

  const activeFilters = [
    filters.vegan ? "VEGANA" : null,
    filters.glutenFree ? "SEM GLÚTEN" : null,
    filters.lactoseFree ? "SEM LACTOSE" : null,
  ].filter(Boolean).join(", ");

  const schema = `{
  "recipe_name": "string",
  "difficulty": "Facil | Medio | Dificil",
  "prep_time": "string",
  "cook_time": "string",
  "servings": 2,
  "dietary_tags": ["Vegana", "Sem Glúten", "Sem Lactose"],
  "ingredients": [
    { "name": "string", "quantity": "string", "calories": 0, "tip": "string" }
  ],
  "steps": [
    { "step_number": 1, "title": "string", "description": "string", "duration": "string", "tip": "string" }
  ],
  "calories_total": 0,
  "nutrition_info": "string",
  "chef_tips": "string",
  "substitutions_made": "string"
}`;

  const systemPrompt = [
    "Voce e um chef profissional brasileiro do app Gastronom.IA.",
    "Responda sempre em portugues do Brasil.",
    "Retorne apenas JSON valido, sem markdown e sem texto extra.",
    "A receita deve ser saborosa, coerente e tecnicamente correta.",
    "IMPORTANTE: Sempre preencha o campo 'dietary_tags' com as tags apropriadas (ex: ['Vegana', 'Sem Glúten']) se a receita atender a esses critérios.",
    "REGRAS CRÍTICAS DE UNIDADES (PROIBIDO DESCUMPRIR):",
    "1. O campo 'quantity' deve conter EXCLUSIVAMENTE: gramas (g), quilos (kg), mililitros (ml) ou litros (l).",
    "2. É TERMINANTEMENTE PROIBIDO usar as palavras: 'unidade', 'un', 'fatia', 'dente', 'xícara', 'colher', 'pitada', 'maço' ou qualquer outra medida não métrica.",
    "3. EXEMPLO OBRIGATÓRIO (CORRETO VS INCORRETO):",
    "   - INCORRETO: { \"name\": \"Ovo\", \"quantity\": \"2 unidades\" }",
    "   - CORRETO: { \"name\": \"Ovo\", \"quantity\": \"100g\", \"tip\": \"Equivale a 2 ovos médios\" }",
    "   - INCORRETO: { \"name\": \"Açúcar\", \"quantity\": \"1 xícara\" }",
    "   - CORRETO: { \"name\": \"Açúcar\", \"quantity\": \"200g\", \"tip\": \"Equivale a 1 xícara\" }",
    "   - INCORRETO: { \"name\": \"Alho\", \"quantity\": \"1 dente\" }",
    "   - CORRETO: { \"name\": \"Alho\", \"quantity\": \"5g\", \"tip\": \"Equivale a 1 dente médio\" }",
    "4. Converta TUDO para métrico (g ou ml). Use o campo 'tip' para explicar a equivalência para o usuário.",
    "5. NUNCA DEVOLVA NADA QUE NÃO SEJA g, kg, ml ou l no campo quantity.",
    "Todos os ingredientes citados no preparo devem existir na lista de ingredientes.",
    "O preparo precisa ter pelo menos 4 passos completos.",
    "Informe calorias realistas e um resumo nutricional por porcao.",
  ].join(" ");

  if (mode === "transform") {
    return {
      systemPrompt,
      userPrompt: [
        "Transforme a receita abaixo e devolva no schema pedido.",
        existingRecipe ? `Receita base: ${existingRecipe}` : "",
        activeFilters ? `Filtros OBRIGATÓRIOS (A receita DEVE ser assim): ${activeFilters}.` : "",
        category ? `Categoria desejada: ${category}.` : "",
        complexity ? `Complexidade desejada: ${complexity}.` : "",
        `Rendimento obrigatorio: ${servings} porcoes.`,
        `Schema JSON: ${schema}`,
        "ATENÇÃO: Converta TUDO para gramas (g) ou mililitros (ml). PROIBIDO xícara, colher, unidade, fatia, etc.",
      ].filter(Boolean).join("\n\n"),
    };
  }

  return {
    systemPrompt,
    userPrompt: [
      "Crie uma receita completa usando os ingredientes abaixo.",
      `Ingredientes: ${ingredients.join(", ")}.`,
      description ? `Descricao do prato desejado: ${description}.` : "",
      category ? `Categoria desejada: ${category}.` : "",
      complexity ? `Complexidade desejada: ${complexity}.` : "",
      activeFilters ? `Filtros OBRIGATÓRIOS (A receita DEVE ser assim): ${activeFilters}.` : "",
      `Rendimento obrigatorio: ${servings} porcoes.`,
      `Schema JSON: ${schema}`,
      "ATENÇÃO: Converta TUDO para gramas (g) ou mililitros (ml). PROIBIDO xícara, colher, unidade, fatia, etc.",
    ].filter(Boolean).join("\n\n"),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = req.headers.get("x-user-id") || req.headers.get("authorization") || "anonymous";
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: "Too many requests. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const ingredients = sanitizeItems(body.ingredients);
    const mode = body.mode === "transform" ? "transform" : "generate";
    const description = body.description ? sanitizeInput(body.description as string) : null;

    if (mode !== "transform" && ingredients.length < 2) {
      return new Response(JSON.stringify({ error: "Envie pelo menos 2 ingredientes" }), {
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

    const { systemPrompt, userPrompt } = buildPrompt(body, ingredients);
    const model = "gemini-1.5-flash";

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleAiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Google AI error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: `Erro da IA (${aiResponse.status}): ${errorText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const rawText = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!rawText) {
      return new Response(JSON.stringify({ error: "A IA nao retornou receita" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseJsonPayload(rawText);
    const normalized = normalizeRecipe(parsed);

    return new Response(JSON.stringify(normalized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("recipe-generator error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
