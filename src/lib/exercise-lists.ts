import { supabase } from "@/integrations/supabase/client";

export type ExerciseListItem = {
  id: string;
  list_id: string;
  number: number;
  statement: string | null;
  options: Record<string, string> | null;
  correct_answer: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  done: boolean;
  page_number: number | null;
  has_visual: boolean;
  visual_summary: string | null;
};

export type ExerciseList = {
  id: string;
  lesson_id: string;
  lesson_title: string | null;
  subject: string | null;
  title: string;
  file_path: string | null;
  total_questions: number;
  created_at: string;
};

/** Todas as listas de exercícios do usuário, com as questões de cada uma. */
export async function fetchExerciseLists() {
  const { data: lists, error } = await supabase
    .from("exercise_lists")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const { data: items, error: itemsError } = await supabase
    .from("exercise_list_items")
    .select("*")
    .order("number", { ascending: true });
  if (itemsError) throw itemsError;

  const byList = new Map<string, ExerciseListItem[]>();
  for (const raw of items ?? []) {
    const item = raw as unknown as ExerciseListItem;
    const bucket = byList.get(item.list_id) ?? [];
    bucket.push(item);
    byList.set(item.list_id, bucket);
  }

  return ((lists ?? []) as unknown as ExerciseList[]).map((list) => ({
    ...list,
    items: byList.get(list.id) ?? [],
  }));
}

export type ExerciseListWithItems = Awaited<ReturnType<typeof fetchExerciseLists>>[number];

/** Uma lista específica com suas questões. */
export async function fetchExerciseList(id: string) {
  const { data: list, error } = await supabase
    .from("exercise_lists")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!list) return null;

  const { data: items, error: itemsError } = await supabase
    .from("exercise_list_items")
    .select("*")
    .eq("list_id", id)
    .order("number", { ascending: true });
  if (itemsError) throw itemsError;

  return {
    ...(list as unknown as ExerciseList),
    items: (items ?? []) as unknown as ExerciseListItem[],
  };
}

/** Marca (ou desmarca) uma questão da lista como feita. */
export async function setItemDone(itemId: string, done: boolean) {
  const { error } = await supabase.from("exercise_list_items").update({ done }).eq("id", itemId);
  if (error) throw error;
}

/** Guarda a resposta marcada e corrige quando existe gabarito. */
export async function answerItem(item: ExerciseListItem, letter: string | null) {
  const correct = item.correct_answer?.toUpperCase() ?? null;
  const is_correct = letter && correct ? letter === correct : null;
  const { error } = await supabase
    .from("exercise_list_items")
    .update({ user_answer: letter, is_correct, done: letter !== null })
    .eq("id", item.id);
  if (error) throw error;
  return is_correct;
}

export async function deleteExerciseList(id: string) {
  const { error } = await supabase.from("exercise_lists").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Espelha uma questão da lista em `exam_questions` para reaproveitar toda a
 * revisão de erros da plataforma (análise passo a passo, flashcards, revisões).
 * Cria no máximo um "simulado" por lista e uma questão por item.
 */
export async function ensureReviewQuestion(
  list: { id: string; title: string; subject: string | null },
  item: ExerciseListItem,
  subjectId?: string | null,
) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sessão expirada.");

  const existing = await supabase
    .from("exam_questions")
    .select("id, subject_id, subject, topic, statement, correct_answer, user_answer")
    .eq("source_type", `lista:${item.id}`)
    .maybeSingle();
  if (existing.data) {
    if (existing.data.user_answer !== item.user_answer) {
      await supabase
        .from("exam_questions")
        .update({ user_answer: item.user_answer, is_correct: item.is_correct })
        .eq("id", existing.data.id);
    }
    return { ...existing.data, user_answer: item.user_answer };
  }

  let examId: string | null = null;
  const exam = await supabase
    .from("exams")
    .select("id")
    .eq("exam_file_path", `lista:${list.id}`)
    .maybeSingle();
  examId = exam.data?.id ?? null;
  if (!examId) {
    const created = await supabase
      .from("exams")
      .insert({
        user_id: uid,
        title: `Lista — ${list.title}`,
        status: "lista",
        exam_file_path: `lista:${list.id}`,
        total_questions: 0,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    examId = created.data.id;
  }

  const { data, error } = await supabase
    .from("exam_questions")
    .insert({
      user_id: uid,
      exam_id: examId,
      number: item.number,
      statement: item.statement,
      options: item.options,
      correct_answer: item.correct_answer,
      user_answer: item.user_answer,
      is_correct: item.is_correct,
      subject: list.subject,
      subject_id: subjectId ?? null,
      source_type: `lista:${item.id}`,
    })
    .select("id, subject_id, subject, topic, statement, correct_answer, user_answer")
    .single();
  if (error) throw error;
  return data;
}
