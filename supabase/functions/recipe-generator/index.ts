import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, isOriginAllowed, checkRateLimit } from "../_shared/config.ts";
import {
  extractGoogleAiText,
  generateGoogleAiContent,
} from "../_shared/google-ai.ts";

const corsHeaders = getCorsHeaders(null);

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

const recipeResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "recipe_name",
    "difficulty",
    "prep_time",
    "cook_time",
    "servings",
    "dietary_tags",
    "ingredients",
    "steps",
    "calories_total",
    "nutrition_info",
    "chef_tips",
    "substitutions_made",
  ],
  properties: {
    recipe_name: { type: "string" },
    difficulty: { type: "string", enum: ["Facil", "Medio", "Dificil"] },
    prep_time: { type: "string" },
    cook_time: { type: "string" },
    servings: { type: "integer", minimum: 1, maximum: 20 },
    dietary_tags: {
      type: "array",
      items: { type: "string" },
    },
    ingredients: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantity", "calories", "tip"],
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          calories: { type: "number" },
          tip: { type: "string" },
        },
      },
    },
    steps: {
      type: "array",
      minItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["step_number", "title", "description", "duration", "tip"],
        properties: {
          step_number: { type: "integer", minimum: 1 },
          title: { type: "string" },
          description: { type: "string" },
          duration: { type: "string" },
          tip: { type: "string" },
        },
      },
    },
    calories_total: { type: "number", minimum: 0 },
    nutrition_info: { type: "string" },
    chef_tips: { type: "string" },
    substitutions_made: { type: "string" },
  },
} as const;

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
      return {
        name: String(record.name ?? "").trim(),
        quantity: String(record.quantity ?? "").trim(),
        calories: Number(record.calories ?? 0) || 0,
        tip: String(record.tip ?? "").trim(),
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

async function fetchExternalRecipe(ingredients: string[]) {
  if (ingredients.length === 0) return null;
  
  try {
    // Tenta buscar pelo primeiro ingrediente principal
    const mainIng = ingredients[0];
    const searchRes = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(mainIng)}`);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const meal = searchData.meals?.[0];
    if (!meal) return null;

    // Busca os detalhes da receita encontrada
    const detailsRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`);
    if (!detailsRes.ok) return null;
    
    const detailsData = await detailsRes.json();
    const fullMeal = detailsData.meals?.[0];
    if (!fullMeal) return null;

    // Constrói um texto base para ajudar a IA
    let recipeText = `Base de Receita Externa (TheMealDB):\nNome: ${fullMeal.strMeal}\nCategoria: ${fullMeal.strCategory}\nInstruções: ${fullMeal.strInstructions}\n\nIngredientes base: `;
    for (let i = 1; i <= 20; i++) {
       const name = fullMeal[`strIngredient${i}`];
       const qty = fullMeal[`strMeasure${i}`];
       if (name && name.trim()) {
         recipeText += `${name} (${qty}), `;
       }
    }
    return recipeText;
  } catch (e) {
    console.error("Erro ao buscar API externa:", e);
    return null;
  }
}

function buildPrompt(body: Record<string, unknown>, ingredients: string[], externalBase: string | null) {
  const mode = body.mode === "transform" ? "transform" : "generate";
  const servings = typeof body.servings === "number" ? Math.min(Math.max(body.servings, 1), 20) : 2;
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const complexity = typeof body.complexity === "string" ? body.complexity.trim() : "";
  const filters = typeof body.filters === "object" && body.filters ? body.filters as Record<string, unknown> : {};
  const existingRecipe = typeof body.existing_recipe === "string" ? body.existing_recipe.trim().slice(0, 5000) : "";
  const nutritionProfile = typeof body.nutritionProfile === "object" && body.nutritionProfile
    ? body.nutritionProfile as Record<string, unknown>
    : null;

  const activeFilters = [
    filters.vegan ? "vegana" : null,
    filters.vegetarian ? "vegetariana" : null,
    filters.glutenFree ? "sem gluten" : null,
    filters.lactoseFree ? "sem lactose" : null,
    body.dietMode === true ? "baixa caloria" : null,
  ].filter(Boolean).join(", ");

  const schema = `{
  "recipe_name": "string",
  "difficulty": "Facil | Medio | Dificil",
  "prep_time": "string",
  "cook_time": "string",
  "servings": 2,
  "dietary_tags": ["string"],
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
    "Voce e um chef profissional internacional do app Gastronom.IA.",
    body.language ? `VOCE DEVE RESPONDER O JSON INTEIRO EXCLUSIVAMENTE NO IDIOMA: ${body.language}.` : "Responda sempre em portugues do Brasil.",
    "Traduza nomes de ingredientes, instrucoes e dicas caso receba uma base em outro idioma.",
    "Retorne apenas JSON valido, sem markdown e sem texto extra.",
    "A receita deve ser saborosa, coerente e tecnicamente correta.",
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
        externalBase ? `Referencia externa para inspiracao: ${externalBase}` : "",
        activeFilters ? `Filtros obrigatorios: ${activeFilters}.` : "",
        category ? `Categoria desejada: ${category}.` : "",
        complexity ? `Complexidade desejada: ${complexity}.` : "",
        `Rendimento obrigatorio: ${servings} porcoes.`,
        `Schema JSON: ${schema}`,
      ].filter(Boolean).join("\n\n"),
    };
  }

  if (nutritionProfile) {
    const allergies = Array.isArray(nutritionProfile.allergies)
      ? (nutritionProfile.allergies as unknown[]).map((item) => String(item)).filter(Boolean)
      : [];

    return {
      systemPrompt,
      userPrompt: [
        "Crie uma receita personalizada para o seguinte perfil nutricional.",
        externalBase ? `Referencia de preparo externa: ${externalBase}` : "",
        `Ingredientes prioritarios: ${ingredients.join(", ") || "livre"}.`,
        description ? `Descricao do prato desejado: ${description}.` : "",
        category ? `Tipo de prato: ${category}.` : "",
        activeFilters ? `Filtros obrigatorios: ${activeFilters}.` : "",
        allergies.length > 0 ? `Alergias proibidas: ${allergies.join(", ")}.` : "",
        `Perfil: ${JSON.stringify(nutritionProfile)}.`,
        `Rendimento obrigatorio: ${servings} porcoes.`,
        `Schema JSON: ${schema}`,
      ].filter(Boolean).join("\n\n"),
    };
  }

  return {
    systemPrompt,
    userPrompt: [
      "Crie uma receita completa usando os ingredientes abaixo.",
      externalBase ? `Use esta base como ponto de partida (Traduza e adapte): ${externalBase}` : "",
      `Ingredientes solicitados: ${ingredients.join(", ")}.`,
      description ? `Descricao do prato desejado: ${description}.` : "",
      category ? `Categoria desejada: ${category}.` : "",
      complexity ? `Complexidade desejada: ${complexity}.` : "",
      activeFilters ? `Filtros obrigatorios: ${activeFilters}.` : "",
      `Rendimento obrigatorio: ${servings} porcoes.`,
      `Schema JSON: ${schema}`,
    ].filter(Boolean).join("\n\n"),
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const defaultCorsHeaders = getCorsHeaders(null);
  
  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: "Origem nao permitida" }), {
      status: 403,
      headers: { ...defaultCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const specificCorsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: specificCorsHeaders });
  }

  try {
    const bearer = getBearerToken(req);
    if (!bearer) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = buildSupabaseClient(bearer);
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

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const ingredients = sanitizeItems(body.ingredients);
    const mode = body.mode === "transform" ? "transform" : "generate";
    const nutritionMode = body.nutritionMode === true;

    if (mode !== "transform" && !nutritionMode && ingredients.length < 2) {
      return new Response(JSON.stringify({ error: "Envie pelo menos 2 ingredientes" }), {
        status: 400,
        headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalBase = await fetchExternalRecipe(ingredients);
    const { systemPrompt, userPrompt } = buildPrompt(body, ingredients, externalBase);
    const { model, response: aiResponse } = await generateGoogleAiContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseJsonSchema: recipeResponseSchema,
      },
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Google AI error:", model, aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar receita" }), {
        status: 500,
        headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json() as Record<string, unknown>;
    const rawText = extractGoogleAiText(data);

    if (!rawText) {
      return new Response(JSON.stringify({ error: "A IA nao retornou receita" }), {
        status: 500,
        headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseJsonPayload(rawText);
    const normalized = normalizeRecipe(parsed);

    return new Response(JSON.stringify(normalized), {
      headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("recipe-generator error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...specificCorsHeaders, "Content-Type": "application/json" },
    });
  }
});
