import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;
let _noop: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // If we already created the real client, always reuse it.
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build/SSG, env vars may not exist.
  // Return a stable no-op proxy so imports don't crash.
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
                data: null,
                error: null,
              }),
              data: null,
              error: null,
            }),
            insert: () => ({
              select: () => ({ single: async () => ({ data: null, error: null }) }),
            }),
            update: () => ({ eq: async () => ({ data: null, error: null }) }),
            delete: () => ({ eq: async () => ({ error: null }) }),
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

  // Create the real browser client exactly once per tab.
  _client = createBrowserClient(url, key);
  return _client;
}
