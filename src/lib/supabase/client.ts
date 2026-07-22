import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Browser-safe Supabase client using the anon key.
 *
 * Per SPEC, public submissions go through the server-side `/api/reports` route
 * (service-role upload + insert), so this client is only for browser-safe reads
 * (e.g. resolving public Storage URLs). The anon key has INSERT-only policies.
 */
export function createBrowserClient() {
  const url = publicEnv.supabaseUrl;
  const anonKey = publicEnv.supabaseAnonKey;

  if (!url || !anonKey) {
    throw new Error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set"
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
