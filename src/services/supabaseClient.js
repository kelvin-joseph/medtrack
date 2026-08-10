import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fails loudly and immediately rather than letting every downstream
  // service call fail with a confusing network error.
  throw new Error(
    "Missing Supabase config. Copy .env.example to .env and set " +
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase " +
    "project's Settings → API page."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
