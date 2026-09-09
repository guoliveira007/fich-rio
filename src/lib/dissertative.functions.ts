import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJson } from "./exam-ai.server";

const BANK_STATUS = "banco";
const AI_BANK_TITLE = "Questões dissertativas geradas por IA";

export type GeneratedDissertative = {
  questionId: string;
  statement: string;
  items: { a: string; b: string };
  expected: { a: string; b: string };
  subject: string;
  subjectId: string | null;
  topic: string | null;
};

/**
 * Gera uma questão dissertativa no estilo do 2º dia da UNIFESP: um enunciado
 * único com os itens "a" e "b", cada um com a resposta esperada para o aluno
 * comparar depois de escrever a própria.
 */
export const generateDissertativeQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subjectId: z.string().uuid().nullable().optional(),
        subjectName: z.string().min(1).max(80),
        board: z.string().min(1).max(60).optional(),
        avoid: z.array(z.string().max(300)).max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<GeneratedDissertative> => {
    const { supabase, userId } = context;
    const board = data.board?.trim() || "UNIFESP";

    let summaryText = "";
    if (data.subjectId) {
      const { data: summaries } = await supabase
        .from("lesson_summaries")
        .select("lesson_title, summary")
        .eq("subject_id", data.subjectId)
        .order("created_at", { ascending: false })
        .limit(2);
      summaryText = (summaries ?? [])
        .map((s) => `### ${s.lesson_title ?? "Resumo"}\n${String(s.summary ?? "").slice(0, 2000)}`)
        .join("\n\n");
    }

    const avoid = (data.avoid ?? []).filter(Boolean);

    const parsed = await aiJson<{
      statement?: string;
      item_a?: string;
      item_b?: string;
      answer_a?: string;
      answer_b?: string;
      topic?: string;
    }>(
      "Você elabora questões DISSERTATIVAS inéditas em português do Brasil no estilo do 2º dia da UNIFESP. " +
        "Cada questão tem um enunciado contextualizado (texto, dado experimental, gráfico descrito ou situação real) " +
        "e dois itens de resolução: a) e b), sendo b) uma etapa mais exigente que depende do raciocínio de a). " +
        "Dê a resposta esperada completa de cada item, com o passo a passo do cálculo ou do raciocínio. " +
        "Use LaTeX entre $...$ para fórmulas e frações. " +
        'Responda só JSON: {"statement":"...","item_a":"...","item_b":"...","answer_a":"...","answer_b":"...","topic":"..."}',
      [
        {
          type: "text",
          text: [
            `Banca: ${board}`,
            `Matéria: ${data.subjectName}`,
            summaryText ? `\nCONTEÚDO ESTUDADO PELO ALUNO:\n${summaryText}` : "",
            avoid.length
              ? `\nNÃO repita estes enunciados já usados:\n${avoid.map((a) => `- ${a}`).join("\n")}`
              : "",
            "\nGere 1 questão dissertativa com itens a) e b).",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    );

    const statement = String(parsed.statement ?? "").trim();
    const itemA = String(parsed.item_a ?? "").trim();
    const itemB = String(parsed.item_b ?? "").trim();
    const answerA = String(parsed.answer_a ?? "").trim();
    const answerB = String(parsed.answer_b ?? "").trim();
    if (!statement || !itemA || !itemB || !answerA || !answerB)
      throw new Error("A IA não conseguiu montar uma questão dissertativa válida. Tente de novo.");

    const { data: bankExam } = await supabase
      .from("exams")
      .select("id")
      .eq("title", AI_BANK_TITLE)
      .eq("status", BANK_STATUS)
      .maybeSingle();

    let examId = bankExam?.id ?? null;
    if (!examId) {
      const { data: created, error: examError } = await supabase
        .from("exams")
        .insert({
          user_id: userId,
          title: AI_BANK_TITLE,
          board,
          status: BANK_STATUS,
          exam_date: new Date().toISOString().slice(0, 10),
          total_questions: 0,
          correct_count: 0,
        })
        .select("id")
        .single();
      if (examError || !created) throw new Error("Não foi possível criar o banco de questões.");
      examId = created.id;
    }

    const { count: existingCount } = await supabase
      .from("exam_questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", examId);

    const { data: inserted, error: insertError } = await supabase
      .from("exam_questions")
      .insert({
        user_id: userId,
        exam_id: examId,
        number: (existingCount ?? 0) + 1,
        statement: `${statement}\n\na) ${itemA}\n\nb) ${itemB}`,
        options: { a: answerA, b: answerB },
        correct_answer: "dissertativa",
        subject: data.subjectName,
        subject_id: data.subjectId ?? null,
        topic: parsed.topic ? String(parsed.topic).slice(0, 120) : null,
        source_type: "ai_generated",
      })
      .select("id")
      .single();
    if (insertError || !inserted) throw new Error("Não foi possível salvar a questão gerada.");

    await supabase
      .from("exams")
      .update({ total_questions: (existingCount ?? 0) + 1 })
      .eq("id", examId);

    return {
      questionId: inserted.id,
      statement,
      items: { a: itemA, b: itemB },
      expected: { a: answerA, b: answerB },
      subject: data.subjectName,
      subjectId: data.subjectId ?? null,
      topic: parsed.topic ? String(parsed.topic).slice(0, 120) : null,
    };
  });
