import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Guarda o id da pessoa logada durante a requisição para que a camada de IA
 * possa buscar a chave Groq de reserva sem precisar receber contexto em cada
 * chamada. Server-only.
 */
const store = new AsyncLocalStorage<{ userId: string | null }>();

export function runWithAiUser<T>(userId: string | null, fn: () => T): T {
  return store.run({ userId }, fn);
}

export function currentAiUserId(): string | null {
  return store.getStore()?.userId ?? null;
}

/** Lê o `sub` do token da requisição (já validado pelo middleware de auth). */
export function userIdFromBearer(header: string | null): string | null {
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, "").trim();
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { sub?: unknown };
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}
