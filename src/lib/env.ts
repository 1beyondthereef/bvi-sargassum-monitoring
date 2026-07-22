/**
 * Centralized, typed environment access.
 *
 * Public vars (NEXT_PUBLIC_*) are safe in the browser bundle.
 * Server-only vars must NEVER be imported into client components — the helpers
 * below throw if a server secret is read outside a server context, and referencing
 * them from client code would surface at build time.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Normalize a Supabase project URL to its origin.
 * supabase-js expects the bare project URL (https://<ref>.supabase.co) and
 * appends /rest/v1, /storage/v1, etc. itself. If the configured value includes
 * a path (e.g. a trailing "/rest/v1/") or trailing slash, strip it to avoid
 * doubled paths like //rest/v1 (PostgREST error PGRST125).
 */
export function normalizeSupabaseUrl(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.trim().replace(/\/+$/, "");
  }
}

/** Public (browser-safe) environment. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
};

/**
 * Server-only environment. Do not call from client components.
 * Throws loudly if invoked in the browser or if a secret is missing.
 */
export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("[env] getServerEnv() must not be called in the browser");
  }
  return {
    supabaseUrl: normalizeSupabaseUrl(
      required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)
    ),
    supabaseServiceRoleKey: required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    adminPassword: required("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD),
    adminSessionSecret: required("ADMIN_SESSION_SECRET", process.env.ADMIN_SESSION_SECRET),
  };
}
