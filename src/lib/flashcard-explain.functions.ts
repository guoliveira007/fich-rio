import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiText } from "./exam-ai.server";

const input = z.object({
  front: z.string().min(1).max(4000),
  back: z.string().min(1).max(8000),
  subject: z.string().max(200).nullable().optional(),
});

/** Explica melhor a resposta de um flashcard, em linguagem didática. */
export const explainFlashcard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => input.parse(raw))
  .handler(async ({ data }) => {
    const system = `Você é um professor de cursinho pré-vestibular brasileiro.
Explique a resposta do flashcard de forma clara, curta e didática, em português.
Formato (markdown simples):
- comece com um parágrafo direto explicando o porquê da resposta;
- depois "**Como lembrar**" com 1 dica ou macete;
- depois "**Cuidado**" com o erro mais comum, se houver.
Use LaTeX entre $...$ para fórmulas. Máximo 180 palavras. Não repita o enunciado.`;

    const text = await aiText(system, [
      {
        type: "text",
        text: `${data.subject ? `Matéria: ${data.subject}\n` : ""}Pergunta: ${data.front}\n\nResposta do cartão: ${data.back}`,
      },
    ]);
    return { explanation: text.trim() };
  });
