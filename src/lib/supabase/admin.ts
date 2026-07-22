import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

/**
 * Service-role Supabase client for server-side admin/write operations.
 *
 * Bypasses the Next.js App Router fetch cache by setting `cache: 'no-store'` on
 * every internal fetch, so admin reads always reflect recent inserts/updates
 * rather than a stale cached snapshot.
 *
 * SERVER ONLY. The service-role key must never reach the browser bundle
 * (verified via a production build grep before deploy — see SPEC 6.3).
 */
export function createAdminClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getServerEnv();

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
