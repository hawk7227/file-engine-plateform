import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;
let _noop: ReturnType<typeof createBrowserClient> | null = null;

function memoryStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

export function createClient() {
  // ✅ Singleton per tab
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ✅ Keep your "safe no-op" behavior for build/SSG
  if (!url || !key) {
    if (_noop) return _noop;

    _noop = new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get(_target, prop) {
        if (prop === "auth") {
          return new Proxy(
            {},
            {
              get() {
                return async () => ({
                  data: { user: null, session: null },
                  error: { message: "Supabase not configured" },
                });
              },
            }
          );
        }
        if (prop === "from") {
          return () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: null,
                  error: { message: "Supabase not configured" },
                }),
              }),
            }),
          });
        }
        if (prop === "rpc") {
          return async () => ({
            data: null,
            error: { message: "Supabase not configured" },
          });
        }
        return undefined;
      },
    });

    return _noop;
  }

  // ✅ Avoid localStorage => avoids auth storage locks
  _client = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      storage: memoryStorage(),
    },
  });

  return _client;
}
