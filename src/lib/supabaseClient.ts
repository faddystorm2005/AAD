import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // We deliberately do not throw here. Build-time static analysis reaches this
  // module before Vercel exposes env vars to route handlers in some cases;
  // throwing would break the build. If the vars are genuinely missing at
  // runtime, createClient will throw on the first call with a clear message.
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY at module init."
  );
}

// Explicit auth options so the session-persistence behavior is documented
// in code instead of relying on @supabase/supabase-js defaults that could
// change in a future major version.
//   persistSession      - write the session to localStorage so refreshes
//                         and tab restores stay signed in.
//   autoRefreshToken    - silently refresh the JWT before it expires so
//                         users never have to re-enter the magic link.
//   detectSessionInUrl  - parse OAuth/recovery URL fragments on mount
//                         (needed for the Google OAuth callback flow).
//
// The client is created on first use, not at import. supabase-js throws
// "supabaseUrl is required" inside createClient when the URL is empty, and the
// public layout now pulls in modules that import this file, so an eager client
// broke the build of any Vercel project without the Supabase env (the
// aad-command-center project, 2026-11-11). Every caller still just uses
// `supabase.from(...)`, `supabase.auth...` as before.
let client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getClient() as unknown as Record<PropertyKey, unknown>;
    const value = c[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(c) : value;
  },
});
