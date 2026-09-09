import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJson, toDataUrl } from "./exam-ai.server";

const BANK_STATUS = "banco";
const AI_BANK_TITLE = "Questões geradas por IA";

export type GeneratedQuestion = {
  questionId: string;
  examId: string;
  statement: string;
  options: Record<string, string>;
  correct_answer: string;
  /** Não havia questões da mesma banca para servir de referência de estilo. */
  missingStyleExamples: boolean;
  sources: {
    summary_ids: string[];
    material_ids: string[];
    reference_question_ids: string[];
    edital_material_id: string | null;
  };
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gera uma questão inédita para um assunto reunindo as três fontes do aluno:
 * (1) resumos e materiais de conteúdo, (2) até 5 questões da mesma banca como
 * referência de estilo e (3) o edital da banca, quando existir.
 */
export const generateQuestionForSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subjectId: z.string().uuid(),
        board: z.string().min(1).max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<GeneratedQuestion> => {
    const { supabase, userId } = context;
    const board = data.board?.trim() || null;

    const { data: subject } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("id", data.subjectId)
      .maybeSingle();
    if (!subject) throw new Error("Assunto não encontrado.");

    // ---- Fonte 1: resumos de aula e materiais de conteúdo do assunto ----
    const [{ data: summaryRows }, { data: materialRows }] = await Promise.all([
      supabase
        .from("lesson_summaries")
        .select("id, lesson_title, summary")
        .eq("subject_id", subject.id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("materials")
        .select("id, title, kind, tags, topic, file_path")
        .eq("subject_id", subject.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const contentMaterials = (materialRows ?? []).filter((m) => m.kind !== "edital").slice(0, 5);

    // ---- Fonte 2: até 5 questões da mesma banca como referência de estilo ----
    let referenceQuestions: { id: string; statement: string | null; options: unknown }[] = [];
    if (board) {
      const { data: examRows } = await supabase
        .from("exams")
        .select("id")
        .ilike("board", board)
        .limit(50);
      const examIds = (examRows ?? []).map((e) => e.id);
      if (examIds.length > 0) {
        const { data: refRows } = await supabase
          .from("exam_questions")
          .select("id, statement, options")
          .in("exam_id", examIds)
          .eq("source_type", "imported")
          .not("statement", "is", null)
          .limit(5);
        referenceQuestions = refRows ?? [];
      }
    }
    const missingStyleExamples = referenceQuestions.length === 0;

    // ---- Fonte 3: edital da banca (materials kind = 'edital') ----
    const editalCandidates = (materialRows ?? []).filter((m) => m.kind === "edital");
    const edital =
      (board
        ? editalCandidates.find((m) =>
            (m.tags ?? []).some((t) => normalizeText(t) === normalizeText(board)),
          )
        : undefined) ?? editalCandidates[0] ?? null;

    // ---- Evitar repetir questões que o aluno já tem ----
    const { data: existingRows } = await supabase
      .from("exam_questions")
      .select("statement")
      .eq("subject_id", subject.id)
      .not("statement", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    const existingKeys = new Set(
      (existingRows ?? []).map((r) => normalizeText(String(r.statement ?? ""))).filter(Boolean),
    );

    const parts: Parameters<typeof aiJson>[1] = [];

    if (edital?.file_path) {
      const file = await supabase.storage.from("materiais").download(edital.file_path);
      if (!file.error && file.data) {
        const bytes = new Uint8Array(await file.data.arrayBuffer());
        if (bytes.length > 0) {
          parts.push({
            type: "file",
            file: {
              filename: edital.title,
              file_data: toDataUrl(bytes, file.data.type || "application/pdf"),
            },
          });
        }
      }
    }

    const summaryText = (summaryRows ?? [])
      .map((s) => `### ${s.lesson_title ?? "Resumo"}\n${String(s.summary ?? "").slice(0, 2500)}`)
      .join("\n\n");
    const materialText = contentMaterials
      .map((m) => `- ${m.title}${m.topic ? ` (${m.topic})` : ""}`)
      .join("\n");
    const referenceText = referenceQuestions
      .map((q, i) => `Exemplo ${i + 1}: ${String(q.statement ?? "").slice(0, 600)}`)
      .join("\n\n");
    const avoidText = [...existingKeys].slice(0, 60).length
      ? `\n\nNÃO repita nem parafraseie estas questões já existentes:\n${(existingRows ?? [])
          .slice(0, 40)
          .map((r) => `- ${String(r.statement ?? "").slice(0, 160)}`)
          .join("\n")}`
      : "";

    parts.push({
      type: "text",
      text: [
        `Matéria/assunto: ${subject.name}`,
        board ? `Banca: ${board}` : "Banca: não informada (use o estilo ENEM).",
        summaryText ? `\nCONTEÚDO ESTUDADO (resumos das aulas):\n${summaryText}` : "",
        materialText ? `\nMATERIAIS DISPONÍVEIS:\n${materialText}` : "",
        referenceText
          ? `\nQUESTÕES DA MESMA BANCA (referência de estilo, NÃO copie):\n${referenceText}`
          : "\nNão há questões desta banca no acervo: use o estilo padrão da banca informada.",
        edital ? `\nO edital em anexo ("${edital.title}") define os conteúdos cobrados.` : "",
        avoidText,
        "\nGere 1 questão inédita.",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const parsed = await aiJson<{
      statement?: string;
      options?: Record<string, string>;
      correct_answer?: string;
      topic?: string;
    }>(
      "Você elabora questões inéditas de múltipla escolha em português do Brasil para vestibulares, " +
        "baseadas EXCLUSIVAMENTE no conteúdo que o aluno estudou e no estilo da banca indicada. " +
        "A questão deve ter enunciado autossuficiente, 5 alternativas (A a E) plausíveis e apenas uma correta. " +
        'Formato: {"statement":"...","options":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correct_answer":"A","topic":"..."}',
      parts,
    );

    const statement = String(parsed.statement ?? "").trim();
    const options: Record<string, string> = {};
    for (const [rawKey, rawValue] of Object.entries(parsed.options ?? {})) {
      const key = String(rawKey ?? "").trim().toUpperCase();
      const value = String(rawValue ?? "").trim();
      if (/^[A-E]$/.test(key) && value) options[key] = value;
    }
    const correct = String(parsed.correct_answer ?? "").trim().toUpperCase();

    if (!statement || Object.keys(options).length < 4 || !correct || !options[correct]) {
      throw new Error("A IA não conseguiu montar uma questão válida. Tente novamente.");
    }
    if (existingKeys.has(normalizeText(statement))) {
      throw new Error("A questão gerada repetia uma já existente. Tente novamente.");
    }

    // ---- Exame "banco" onde as questões geradas ficam guardadas ----
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

    const sources = {
      summary_ids: (summaryRows ?? []).map((s) => s.id),
      material_ids: contentMaterials.map((m) => m.id),
      reference_question_ids: referenceQuestions.map((q) => q.id),
      edital_material_id: edital?.id ?? null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("exam_questions")
      .insert({
        user_id: userId,
        exam_id: examId,
        number: (existingCount ?? 0) + 1,
        statement,
        options,
        correct_answer: correct,
        subject: subject.name,
        subject_id: subject.id,
        topic: parsed.topic ? String(parsed.topic).slice(0, 120) : null,
        source_type: "ai_generated",
        generation_sources: { ...sources, board, missing_style_examples: missingStyleExamples },
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
      examId,
      statement,
      options,
      correct_answer: correct,
      missingStyleExamples,
      sources,
    };
  });
