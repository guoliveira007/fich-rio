import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJson, toDataUrl } from "./exam-ai.server";

/**
 * Lê o edital enviado na Biblioteca para uma matéria e salva a lista de
 * assuntos exigidos em edital_topics, para a tela de progresso comparar com
 * o que o aluno já respondeu.
 */
export const extractEditalTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ subjectIds: z.array(z.string().uuid()).min(1).max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: materials } = await supabase
      .from("materials")
      .select("id, subject_id, title, kind, tags, file_path")
      .in("subject_id", data.subjectIds)
      .eq("kind", "edital")
      .order("created_at", { ascending: false })
      .limit(3);

    const edital = (materials ?? []).find((m) => m.file_path);
    if (!edital?.file_path) {
      throw new Error(
        "Nenhum edital enviado para esta matéria. Envie o edital na Biblioteca (tipo edital).",
      );
    }

    const file = await supabase.storage.from("materiais").download(edital.file_path);
    if (file.error || !file.data) throw new Error("Não consegui abrir o edital enviado.");
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    if (bytes.length === 0) throw new Error("O arquivo do edital está vazio.");

    if (!edital.subject_id)
      throw new Error("Este edital não está ligado a uma matéria. Defina a matéria antes de gerar os tópicos.");
    const board = (edital.tags ?? []).find((t) => t.toLowerCase() !== "edital") ?? null;

    const parsed = await aiJson<{ topics?: string[] }>(
      `Você lê editais de vestibulares e lista os conteúdos programáticos cobrados.
Devolva {"topics":["...","..."]} com os assuntos da matéria indicada, um por item, na ordem do edital.
Cada assunto deve ser curto (máximo 90 caracteres) e específico o suficiente para virar um tópico de estudo.
Não invente assuntos que não estejam no edital. No máximo 80 itens.`,
      [
        {
          type: "file",
          file: {
            filename: edital.title,
            file_data: toDataUrl(bytes, file.data.type || "application/pdf"),
          },
        },
        {
          type: "text",
          text: `Liste os assuntos do conteúdo programático desta matéria neste edital${
            board ? ` (banca ${board})` : ""
          }.`,
        },
      ],
    );

    const topics = [
      ...new Set(
        (parsed.topics ?? [])
          .map((t) => String(t ?? "").trim().replace(/\s+/g, " ").slice(0, 90))
          .filter((t) => t.length > 2),
      ),
    ].slice(0, 80);

    if (topics.length === 0) throw new Error("Não encontrei conteúdo programático neste edital.");

    const subjectId = edital.subject_id;
    const rows = topics.map((topic, index) => ({
      user_id: userId,
      subject_id: subjectId,
      material_id: edital.id,
      board,
      topic,
      position: index,
    }));

    const { error } = await supabase
      .from("edital_topics")
      .upsert(rows, { onConflict: "user_id,subject_id,topic" });
    if (error) throw new Error(error.message);

    return { subjectId, board, count: topics.length };
  });
