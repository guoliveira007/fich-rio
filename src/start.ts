import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachFreshSupabaseAuth } from "@/lib/supabase-auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Deixa o id da pessoa logada disponível para a camada de IA (reserva Groq).
const aiUserMiddleware = createMiddleware().server(async ({ next, request }) => {
  const { runWithAiUser, userIdFromBearer } = await import("@/lib/ai-user-context.server");
  const userId = userIdFromBearer(request?.headers?.get("authorization") ?? null);
  return runWithAiUser(userId, () => next());
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, attachFreshSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware, aiUserMiddleware],
}));
