type InvokeOptions = {
  body?: Record<string, unknown>;
  token?: string | null;
};

type InvokeResult<T> = {
  data: T | null;
  error: Error | null;
};

export async function invokeEdgeFunction<T>(
  name: string,
  { body, token }: InvokeOptions = {},
): Promise<InvokeResult<T>> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        ...(token ? { 'x-user-jwt': token } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      const message = typeof payload === 'object' && payload && 'error' in payload
        ? String((payload as { error?: string }).error)
        : typeof payload === 'object' && payload && 'message' in payload
          ? String((payload as { message?: string }).message)
          : `Edge Function ${name} failed`;

      return { data: null, error: new Error(message) };
    }

    return { data: payload as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to send a request to the Edge Function'),
    };
  }
}
