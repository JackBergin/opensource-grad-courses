import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export function createClient() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    return null;
  }

  return createBrowserClient(url!, anonKey!);
}
