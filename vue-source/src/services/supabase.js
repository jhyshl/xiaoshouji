import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://tlsdyacdkbcjxbwvyeim.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EIYn8wiMd0O4tJXQI5Ub4Q_066Uizi1";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export function appRedirectUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}
