import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "./config.ts";

type LogStep = (step: string, details?: Record<string, unknown>) => void;

const DEFAULT_ORIGIN = "https://app.gastronomia.com.br";

export const corsHeaders = getCorsHeaders(null);

export function getOrigin(req: Request) {
  return req.headers.get("origin") || DEFAULT_ORIGIN;
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function createAdminClient(logStep?: LogStep): SupabaseClient | null {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    logStep?.("SUPABASE_SERVICE_ROLE_KEY missing, operations may fail");
    return null;
  }

  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    serviceRoleKey,
    { auth: { persistSession: false } },
  );
}

export async function getAuthenticatedUser(req: Request, logStep?: LogStep) {
  const authHeader = req.headers.get("Authorization");
  const customToken = req.headers.get("x-user-jwt");
  const token = customToken || authHeader?.replace("Bearer ", "");
  if (!token) throw new Error("No authorization token");

  const supabaseClient = createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } },
  );

  logStep?.("Validating token", { tokenPrefix: token.substring(0, 20) });

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data.user?.email) {
    throw new Error(error?.message || "User not authenticated");
  }

  logStep?.("User authenticated", {
    userId: data.user.id,
    email: data.user.email,
  });

  return data.user;
}
