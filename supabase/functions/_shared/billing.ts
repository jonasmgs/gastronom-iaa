import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2.57.2";

type LogStep = (step: string, details?: Record<string, unknown>) => void;

// O DEFAULT_ORIGIN é usado como fallback caso o checkout seja iniciado sem o header origin.
const DEFAULT_ORIGIN = "https://app.gastronomia.com.br";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-jwt, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function getOrigin(req: Request) {
  return req.headers.get("origin") || DEFAULT_ORIGIN;
}

export function createAdminClient(logStep?: LogStep): SupabaseClient | null {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    logStep?.("SUPABASE_SERVICE_ROLE_KEY missing, customer cache disabled");
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

async function readStripeCustomerId(
  adminClient: SupabaseClient | null,
  userId: string,
  logStep?: LogStep,
) {
  if (!adminClient) return null;

  const { data, error } = await adminClient
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logStep?.("Profile lookup failed", { message: error.message });
    return null;
  }

  return data?.stripe_customer_id ?? null;
}

async function persistStripeCustomerId(
  adminClient: SupabaseClient | null,
  userId: string,
  customerId: string,
  logStep?: LogStep,
) {
  if (!adminClient) return;

  const { error } = await adminClient
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);

  if (error) {
    logStep?.("Failed to cache customer ID", { message: error.message });
    return;
  }

  logStep?.("Customer ID cached", { customerId });
}

type StripeCustomerOptions = {
  adminClient: SupabaseClient | null;
  stripe: Stripe;
  user: User;
  createIfMissing?: boolean;
  logStep?: LogStep;
};

export async function getOrCreateStripeCustomerId({
  adminClient,
  stripe,
  user,
  createIfMissing = false,
  logStep,
}: StripeCustomerOptions) {
  let customerId = await readStripeCustomerId(adminClient, user.id, logStep);

  if (customerId) {
    logStep?.("Customer ID loaded from profile", { customerId });
    return customerId;
  }

  const customers = await stripe.customers.list({
    email: user.email ?? undefined,
    limit: 1,
  });

  customerId = customers.data[0]?.id ?? null;

  if (!customerId && createIfMissing) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });

    customerId = customer.id;
    logStep?.("Stripe customer created", { customerId });
  } else {
    logStep?.("Customer lookup done", { hasCustomer: Boolean(customerId) });
  }

  if (customerId) {
    await persistStripeCustomerId(adminClient, user.id, customerId, logStep);
  }

  return customerId;
}
