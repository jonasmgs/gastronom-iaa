type GoogleAiPart = {
  text: string;
};

type GoogleAiContent = {
  role: "user" | "model";
  parts: GoogleAiPart[];
};

type GoogleAiRequestOptions = {
  contents: GoogleAiContent[];
  systemInstruction?: string;
  generationConfig?: Record<string, unknown>;
};

const GOOGLE_AI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
export const DEFAULT_GOOGLE_AI_MODEL = "gemini-2.5-flash-lite";

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} nao configurada`);
  return value;
}

export function getGoogleAiModel() {
  return Deno.env.get("GOOGLE_AI_MODEL")?.trim() || DEFAULT_GOOGLE_AI_MODEL;
}

export async function generateGoogleAiContent({
  contents,
  systemInstruction,
  generationConfig,
}: GoogleAiRequestOptions) {
  const apiKey = getRequiredEnv("GOOGLE_AI_KEY");
  const model = getGoogleAiModel();

  const response = await fetch(
    `${GOOGLE_AI_API_BASE}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
          : {}),
        ...(generationConfig ? { generationConfig } : {}),
      }),
    },
  );

  return { model, response };
}

export function extractGoogleAiText(data: Record<string, unknown>) {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const firstCandidate = candidates[0];
  if (!firstCandidate || typeof firstCandidate !== "object") return "";

  const content = (firstCandidate as { content?: unknown }).content;
  if (!content || typeof content !== "object") return "";

  const parts = Array.isArray((content as { parts?: unknown[] }).parts)
    ? (content as { parts: Array<{ text?: unknown }> }).parts
    : [];

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}
