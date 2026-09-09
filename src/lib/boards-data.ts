import { supabase } from "@/integrations/supabase/client";
import type { Material } from "./study";

export type BoardCounts = {
  editais: number;
  provas: number;
};

export async function fetchBoardCounts(boardName: string): Promise<BoardCounts> {
  const { count: editais, error: e1 } = await supabase
    .from("materials")
    .select("id", { count: "exact", head: true })
    .eq("kind", "edital")
    .contains("tags", [boardName]);
  if (e1) throw e1;

  const { count: provas, error: e2 } = await supabase
    .from("exams")
    .select("id", { count: "exact", head: true })
    .eq("board", boardName);
  if (e2) throw e2;

  return { editais: editais ?? 0, provas: provas ?? 0 };
}

export async function fetchBoardEditais(boardName: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("kind", "edital")
    .contains("tags", [boardName])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Material[];
}

export async function fetchBoardProvas(boardName: string, limit = 10) {
  const { data, error } = await supabase
    .from("exams")
    .select("id, title, exam_date, total_questions, correct_count, status, exam_file_path")
    .eq("board", boardName)
    .order("exam_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
