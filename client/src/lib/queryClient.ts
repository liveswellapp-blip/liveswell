import { QueryClient, QueryCache, MutationCache, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { isSuspendedError } from "./authUtils";

/** Get the current Clerk session JWT to attach to API requests. */
export async function getClerkToken(): Promise<string | null> {
  try {
    // window.Clerk is populated by ClerkProvider after initialisation.
    return await (window as any).Clerk?.session?.getToken() ?? null;
  } catch {
    return null;
  }
}

/** Merge Authorization header into any existing headers. */
async function authHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const token = await getClerkToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: {
    method: string;
    body?: unknown;
  },
): Promise<Response> {
  const headers = await authHeaders(
    options.body ? { "Content-Type": "application/json" } : undefined,
  );
  const res = await fetch(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers = await authHeaders();
    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Global error handler for query/mutation errors.
 * Shows a clear "account suspended" toast when the server returns 403 + suspended.
 * Only fires once per error event, not once per retry.
 */
function handleGlobalError(error: unknown) {
  if (error instanceof Error && isSuspendedError(error)) {
    toast({
      title: "Account suspended",
      description: "Your account has been suspended. Please contact support for assistance.",
      variant: "destructive",
    });
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleGlobalError,
  }),
  mutationCache: new MutationCache({
    onError: handleGlobalError,
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
