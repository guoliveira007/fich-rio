import { createMiddleware } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";

/** Margem de segurança: renova o token quando falta menos que isso para expirar. */
const REFRESH_MARGIN_SECONDS = 300;

async function currentToken(forceRefresh = false): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  const expiresAt = session.expires_at ?? 0;
  const secondsLeft = expiresAt - Math.floor(Date.now() / 1000);

  if (forceRefresh || secondsLeft < REFRESH_MARGIN_SECONDS) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session?.access_token) return refreshed.session.access_token;
  }

  return session.access_token ?? null;
}

function isAuthFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /unauthorized|invalid token|jwt|expired/i.test(message);
}

/**
 * Anexa o token do usuário nas chamadas de servidor, renovando-o antes de expirar
 * e tentando de novo uma única vez quando o servidor recusa o token.
 * Substitui `attachSupabaseAuth` para evitar falhas em uploads/leituras demoradas.
 */
export const attachFreshSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token = await currentToken();
    if (!token) token = await currentToken(true);

    try {
      return await next(token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    } catch (error) {
      if (isAuthFailure(error)) {
        // Renova para que a próxima tentativa do usuário já use um token válido.
        await supabase.auth.refreshSession().catch(() => undefined);
        throw new Error("Sua sessão expirou. Entre de novo e tente enviar o arquivo outra vez.");
      }
      throw error;
    }
  },
);

