import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ugcpcfjgppuynntsskjv.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable__I5hK0arHHUdhIXasEgL7A_hUJeY63e";

/**
 * SECURITY: Secure storage adapter using sessionStorage.
 *
 * Unlike localStorage, sessionStorage is automatically cleared when the
 * browser tab or window is closed. This guarantees:
 *  - Closing the tab  → automatic logout
 *  - Closing the browser → automatic logout
 *  - Page reload → session preserved (sessionStorage persists on reload)
 *  - Each tab gets its own isolated session
 */
const secureSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Silently fail if sessionStorage is unavailable
    }
  },
  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureSessionStorage,
    storageKey: "guenet-auth-token",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
