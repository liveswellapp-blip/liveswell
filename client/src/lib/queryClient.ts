import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

export const queryClient = new QueryClient({
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
