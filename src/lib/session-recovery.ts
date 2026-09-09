import { supabase } from "@/integrations/supabase/client";

const AUTH_ERROR_PATTERNS = [
  "invalid token",
  "invalid jwt",
  "bad_jwt",
  "unrecognized jwt",
  "jwt expired",
  "token is unverifiable",
  "unauthorized",
  "refresh token",
  "session expired",
  "session_not_found",
  "sua sessão expirou",
];

/** True when the failure comes from a stale/invalid login session. */
export function isAuthError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  if (!message) return false;
  return AUTH_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

/** Drops any leftover Supabase session data from this browser. */
export function clearStoredSession() {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key && key.startsWith("sb-")) keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
    } catch {
      // storage may be unavailable (private mode) — nothing else to clean up
    }
  }
}

/** Signs out locally and clears leftovers so the next login starts clean. */
export async function recoverFromAuthError() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore — we clear the storage below either way
  }
  clearStoredSession();
}
