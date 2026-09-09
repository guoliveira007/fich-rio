import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Cloud, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { CloudFilePicker } from "@/components/CloudFilePicker";
import { getOneDriveFileUrl } from "@/lib/onedrive.functions";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/error-message";
import { extractExamQuestions, type ExtractedQuestion } from "@/lib/exams.functions";

type Lesson = { id: string; title: string; subject?: string | undefined };

const field =
  "w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-sun";
const label = "font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft";

/** Envia o PDF de uma lista de exercícios, lê as questões e cria a lista da aula. */
export function AddExerciseListDialog({
  lesson,
  onOpenChange,
}: {
  lesson: Lesson | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const readExam = useServerFn(extractExamQuestions);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [source, setSource] = useState<"device" | "cloud">("device");
  const fileUrl = useServerFn(getOneDriveFileUrl);

  async function handleCloudPick(picked: { id: string; name: string; driveId: string | null }) {
    if (busy || !lesson) return;
    setBusy(true);
    setProgress("Baixando o arquivo da nuvem…");
    try {
      const { url, name } = await fileUrl({
        data: { itemId: picked.id, ...(picked.driveId ? { driveId: picked.driveId } : {}) },
      });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Não consegui baixar esse arquivo da nuvem.");
      const blob = await res.blob();
      const file = new File([blob], name || picked.name, {
        type: blob.type || "application/pdf",
      });
      setBusy(false);
      setProgress(null);
      await handleFile(file);
    } catch (err) {
      setBusy(false);
      setProgress(null);
      toast.error(errorMessage(err, "Não foi possível usar esse arquivo da nuvem."));
    }
  }


  async function upload(file: File) {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error("Sessão expirada.");
    const path = `${uid}/listas/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("exam-files").upload(path, file);
    if (error) throw error;
    return { path, uid };
  }

  async function handleFile(file: File) {
    if (!lesson) return;
    setBusy(true);
    setProgress("Enviando o arquivo…");
    const byNumber = new Map<number, ExtractedQuestion>();
    try {
      const { path, uid } = await upload(file);

      let chunk = 0;
      let totalChunks = 1;
      do {
        setProgress(
          `Lendo a lista: parte ${chunk + 1} de ${totalChunks} — ${byNumber.size} questões até agora.`,
        );
        const result = await readExam({ data: { filePath: path, chunkIndex: chunk, chunkSize: 4 } });
        totalChunks = result.totalChunks ?? 1;
        for (const q of result.questions ?? []) {
          const current = byNumber.get(q.number);
          const score = (item: ExtractedQuestion) =>
            (item.statement?.length ?? 0) + (item.options ? Object.keys(item.options).length * 200 : 0);
          if (!current || score(q) > score(current)) byNumber.set(q.number, q);
        }
        chunk += 1;
      } while (chunk < totalChunks);

      const questions = [...byNumber.values()].sort((a, b) => a.number - b.number);
      if (questions.length === 0) {
        toast.warning("Não consegui ler questões nesse arquivo. Tente um PDF com texto selecionável.");
        return;
      }

      setProgress("Salvando a lista…");
      const { data: list, error } = await supabase
        .from("exercise_lists")
        .insert({
          user_id: uid,
          lesson_id: lesson.id,
          lesson_title: lesson.title.slice(0, 200),
          subject: lesson.subject ?? null,
          title: (title.trim() || `Lista — ${lesson.title}`).slice(0, 120),
          file_path: path,
          total_questions: questions.length,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("exercise_list_items").insert(
        questions.map((q) => ({
          user_id: uid,
          list_id: list.id,
          number: q.number,
          statement: q.statement ?? null,
          options: q.options ?? null,
          correct_answer: q.correct_answer?.toUpperCase() ?? null,
          page_number: q.page_number ?? null,
          has_visual: q.has_visual === true,
          visual_summary: q.visual_summary ?? null,
        })),
      );
      if (itemsError) throw itemsError;

      queryClient.invalidateQueries({ queryKey: ["exercise-lists"] });
      toast.success(`Lista criada com ${questions.length} questões.`);
      setTitle("");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível criar a lista."));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <Dialog open={lesson !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display">Adicionar lista de exercícios</DialogTitle>
          <DialogDescription className="break-words">
            {lesson?.title ?? ""} — envie o PDF e a lista vira um simulado com questões marcáveis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-hidden">
          <label className="block space-y-2">
            <span className={label}>Nome da lista</span>
            <input
              className={field}
              value={title}
              maxLength={120}
              placeholder="Lista 3 — Cinemática"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["device", "Do computador", Upload],
                ["cloud", "Da nuvem", Cloud],
              ] as const
            ).map(([value, text, Icon]) => (
              <button
                key={value}
                type="button"
                disabled={busy}
                onClick={() => setSource(value)}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-60 ${
                  source === value
                    ? "border-sun bg-sun/10 text-ink"
                    : "border-line text-ink-soft hover:border-sun"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{text}</span>
              </button>
            ))}
          </div>

          {source === "device" ? (
            <label
              className={`flex cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-paper px-4 py-10 text-sm transition-colors hover:border-sun ${
                busy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Upload className="size-5 text-sun-deep" />
              )}
              {busy ? "Lendo a lista…" : "Selecionar PDF da lista"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <CloudFilePicker disabled={busy} onPick={(f) => void handleCloudPick(f)} />
          )}


          {progress && <p className="text-sm text-sun-deep">{progress}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
