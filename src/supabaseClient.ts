import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ugcpcfjgppuynntsskjv.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable__I5hK0arHHUdhIXasEgL7A_hUJeY63e";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
