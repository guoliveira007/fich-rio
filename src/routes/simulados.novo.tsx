import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/error-message";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { CloudFilePicker } from "@/components/CloudFilePicker";
import { ExamPagePreview } from "@/components/ExamPagePreview";
import { WizardVisualReading } from "@/components/WizardVisualReading";

import { supabase } from "@/integrations/supabase/client";
import { BOARDS, boardById } from "@/lib/boards";
import { BANK_STATUS } from "@/lib/practice";
import {
  extractAnswerKey,
  extractExamQuestions,
  generateStudyPlan,
  type ExtractedQuestion,
} from "@/lib/exams.functions";
import { LETTERS } from "@/lib/exam-utils";
import { classifyQuestions } from "@/lib/exam-link";
import { getOneDriveFileUrl } from "@/lib/onedrive.functions";
import { fetchSubjects } from "@/lib/study";
import { cleanText, RichText } from "@/lib/text";

const searchSchema = z.object({
  board: z.string().optional(),
});

export const Route = createFileRoute("/simulados/novo")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Novo simulado — Fichário" },
      {
        name: "description",
        content: "Envie a prova em PDF, o gabarito oficial e suas respostas para corrigir na hora.",
      },
      { property: "og:title", content: "Corrigir um novo simulado" },
      {
        property: "og:description",
        content: "Prova em PDF, gabarito e respostas: correção automática com IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <NovoSimulado />
    </AppShell>
  ),
});

const today = () => new Date().toISOString().slice(0, 10);

const field =
  "w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-sun";

function NovoSimulado() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/simulados/novo" });
  const readExam = useServerFn(extractExamQuestions);
  const readKey = useServerFn(extractAnswerKey);
  const makePlan = useServerFn(generateStudyPlan);
  const queryClient = useQueryClient();

  const initialBoardId =
    typeof search.board === "string" && boardById(search.board) ? search.board : "";
  const initialBoard = boardById(initialBoardId);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState(today());
  const [boardId, setBoardId] = useState(initialBoardId);
  const [board, setBoard] = useState(initialBoard?.name ?? "");
  const [bankOnly, setBankOnly] = useState(false);
  const [total, setTotal] = useState(initialBoard ? initialBoard.areas.reduce((acc, a) => acc + a.questions, 0) : 20);

  const [examPath, setExamPath] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [readingExam, setReadingExam] = useState(false);
  const [readProgress, setReadProgress] = useState<{ done: number; total: number | null; found: number; recovering: boolean } | null>(null);

  const [keyAnswers, setKeyAnswers] = useState<Record<number, string>>({});
  const [readingKey, setReadingKey] = useState(false);

  const [myAnswers, setMyAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const numbers = Array.from({ length: Math.max(0, Math.min(total, 300)) }, (_, i) => i + 1);

  async function upload(file: File) {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error("Sessão expirada.");
    const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("exam-files").upload(path, file);
    if (error) throw error;
    return path;
  }

  /** Lê um trecho, com nova tentativa curta quando a resposta vem vazia. */
  async function readExamChunk(payload: {
    filePath: string;
    chunkIndex: number;
    chunkSize?: number;
    pageFrom?: number;
    pageTo?: number;
  }) {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await readExam({ data: payload });
        if (result && typeof result === "object") return result;
        lastError = new Error("O servidor devolveu uma resposta vazia ao ler o PDF.");
      } catch (err) {
        lastError = err;
        if (errorMessage(err, "").startsWith("Sua sessão expirou")) throw err;
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
    throw lastError instanceof Error ? lastError : new Error("Falha ao ler o trecho do PDF.");
  }

  async function handleExamFile(file: File) {
    setReadingExam(true);
    setReadProgress(null);
    const byNumber = new Map<number, ExtractedQuestion>();

    /** Mantém sempre a versão mais completa de cada questão. */
    const merge = (list: ExtractedQuestion[]) => {
      const score = (q: ExtractedQuestion) =>
        (q.statement?.length ?? 0) +
        (q.options ? Object.keys(q.options).length * 200 : 0) +
        (q.correct_answer ? 150 : 0);
      for (const q of list) {
        const current = byNumber.get(q.number);
        if (!current || score(q) > score(current)) byNumber.set(q.number, q);
      }
    };

    try {
      const path = await upload(file);
      setExamPath(path);
      setReadProgress({ done: 0, total: null, found: 0, recovering: false });

      const pagesToReview: number[] = [];
      let chunk = 0;
      let totalChunks = 1;

      do {
        setReadProgress((prev) => ({
          done: chunk,
          total: chunk === 0 ? null : totalChunks,
          found: byNumber.size,
          recovering: prev?.recovering ?? false,
        }));

        const result = await readExamChunk({ filePath: path, chunkIndex: chunk, chunkSize: 4 });
        totalChunks = result.totalChunks ?? 1;

        // Um trecho problemático é repetido e, se preciso, lido página por página.
        if (result.failed && result.isPdf) {
          setReadProgress({ done: chunk, total: totalChunks, found: byNumber.size, recovering: true });
          for (let page = result.firstPage; page <= result.lastPage; page += 1) {
            const single = await readExamChunk({
              filePath: path,
              chunkIndex: chunk,
              pageFrom: page,
              pageTo: page,
            });
            if (single.failed) pagesToReview.push(page);
            else merge(single.questions ?? []);
          }
          setReadProgress({ done: chunk, total: totalChunks, found: byNumber.size, recovering: false });
        } else {
          merge(result.questions ?? []);
        }

        chunk += 1;
        setReadProgress({
          done: Math.min(chunk, totalChunks),
          total: totalChunks,
          found: byNumber.size,
          recovering: false,
        });
      } while (chunk < totalChunks);

      const list = [...byNumber.values()].sort((a, b) => a.number - b.number);
      if (list.length === 0) {
        toast.warning("Não consegui ler as questões. Preencha o gabarito e as respostas na mão.");
      } else {
        setQuestions(list);
        setTotal(Math.max(list.length, list[list.length - 1]?.number ?? list.length));
        const fromPdf: Record<number, string> = {};
        for (const q of list) if (q.correct_answer) fromPdf[q.number] = q.correct_answer.toUpperCase();
        if (Object.keys(fromPdf).length > 0) setKeyAnswers((prev) => ({ ...fromPdf, ...prev }));
        if (pagesToReview.length > 0) {
          toast.warning(
            `${list.length} questões lidas. Confira à mão as páginas ${pagesToReview.slice(0, 8).join(", ")}${pagesToReview.length > 8 ? "…" : ""}.`,
          );
        } else {
          toast.success(`${list.length} questões lidas da prova.`);
        }
      }
    } catch (err) {
      const partial = [...byNumber.values()].sort((a, b) => a.number - b.number);
      if (partial.length > 0) {
        setQuestions(partial);
        setTotal(Math.max(partial.length, partial[partial.length - 1]?.number ?? partial.length));
        toast.warning(
          `A leitura parou antes do fim, mas ${partial.length} questões foram aproveitadas. Complete o restante à mão.`,
        );
      } else {
        toast.error(errorMessage(err, "Falha ao ler o PDF da prova."));
      }
    } finally {
      setReadingExam(false);
      setReadProgress(null);
    }
  }

  async function handleKeyFile(file: File) {
    setReadingKey(true);
    try {
      const path = await upload(file);
      const result = await readKey({ data: { filePath: path } });
      const map: Record<number, string> = {};
      for (const a of result.answers ?? []) map[a.number] = a.answer;
      if (Object.keys(map).length === 0) {
        toast.warning("Não consegui ler o gabarito. Preencha na mão.");
      } else {
        setKeyAnswers((prev) => ({ ...prev, ...map }));
        if (Object.keys(map).length > total) setTotal(Object.keys(map).length);
        toast.success(`${Object.keys(map).length} respostas do gabarito lidas.`);
      }
    } catch (err) {
      toast.error(errorMessage(err, "Falha ao ler o PDF do gabarito."));
    } finally {
      setReadingKey(false);
    }
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Dê um nome ao simulado.");
      return;
    }
    const answered = numbers.filter((n) => keyAnswers[n]);
    if (answered.length === 0) {
      toast.error("Preencha o gabarito oficial.");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada.");

      const subjects = await fetchSubjects().catch(() => []);
      const rows = numbers.map((n) => {
        const extracted = questions.find((q) => q.number === n);
        const correct = keyAnswers[n]?.toUpperCase() ?? null;
        const mine = bankOnly ? null : (myAnswers[n]?.toUpperCase() ?? null);
        return {
          user_id: uid,
          number: n,
          subject: extracted?.subject ?? null,
          topic: extracted?.topic ?? null,
          statement: extracted?.statement ?? null,
          options: extracted?.options ?? null,
          page_number: extracted?.page_number ?? null,
          has_visual: extracted?.has_visual === true,
          visual_summary: extracted?.visual_summary ?? null,

          correct_answer: correct,
          user_answer: mine,
          is_correct: bankOnly ? null : correct && mine ? correct === mine : mine === null ? false : null,
        };

      });
      const classified = classifyQuestions(subjects, rows);
      const correctCount = rows.filter((r) => r.is_correct === true).length;

      const { data: exam, error } = await supabase
        .from("exams")
        .insert({
          user_id: uid,
          title: title.trim().slice(0, 120),
          exam_date: examDate,
          board: board.trim().slice(0, 80) || null,
          total_questions: rows.length,
          correct_count: correctCount,
          status: bankOnly ? BANK_STATUS : "corrigido",
          exam_file_path: examPath,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: qError } = await supabase
        .from("exam_questions")
        .insert(classified.map((r) => ({ ...r, exam_id: exam.id })));
      if (qError) throw qError;

      if (bankOnly) {
        toast.success(`Banco salvo: ${rows.length} questões disponíveis para praticar.`);
        queryClient.invalidateQueries({ queryKey: ["exams"] });
        navigate({ to: "/simulados" });
        return;
      }

      toast.success(`Correção pronta: ${correctCount}/${rows.length} acertos.`);
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["revisoes"] });
      queryClient.invalidateQueries({ queryKey: ["subject-errors"] });
      navigate({ to: "/simulados/$id", params: { id: exam.id } });

      void (async () => {
        try {
          await makePlan({ data: { examId: exam.id } });
          queryClient.invalidateQueries({ queryKey: ["exam-plan", exam.id] });
          toast.success("Plano de revisão gerado para este simulado.");
        } catch {
          toast.message("Correção salva. Gere o plano de revisão quando quiser.");
        }
      })();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar o simulado."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">Corretor</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Novo simulado</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Etapa {step} de 4 — prova, gabarito, respostas e correção.
        </p>
      </header>

      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-sun" : "bg-line"}`} />
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-card p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Dados do simulado</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Nome</span>
                <input
                  className={field}
                  value={title}
                  maxLength={120}
                  placeholder="Simulado ENEM 03"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Data</span>
                <input
                  className={field}
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Banca / tipo</span>
                <select
                  className={field}
                  value={boardId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setBoardId(id);
                    const ref = boardById(id);
                    if (ref) {
                      setBoard(ref.name);
                      setTotal(ref.areas.reduce((acc, a) => acc + a.questions, 0));
                    } else if (id !== "outra") {
                      setBoard("");
                    }
                  }}
                >
                  <option value="">Selecione…</option>
                  {BOARDS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  <option value="outra">Outra</option>
                </select>
                {boardId === "outra" && (
                  <input
                    className={field}
                    value={board}
                    maxLength={80}
                    placeholder="Nome da banca ou do simulado"
                    onChange={(e) => setBoard(e.target.value)}
                  />
                )}
                {boardById(boardId) && (
                  <span className="block text-xs text-ink-soft">
                    {boardById(boardId)!.reference} —{" "}
                    {boardById(boardId)!
                      .areas.map((a) => `${a.area}: ${a.questions}`)
                      .join(" · ")}
                  </span>
                )}
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Número de questões</span>
                <input
                  className={field}
                  type="number"
                  min={1}
                  max={200}
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-line bg-paper px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={bankOnly}
                onChange={(e) => setBankOnly(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span>
                <span className="font-medium">Usar só como banco de questões</span>
                <span className="block text-xs text-ink-soft">
                  A prova entra no banco para sessões de prática, mas não aparece como simulado
                  corrigido nem conta na sua nota.
                </span>
              </span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">PDF da prova</h2>
            <p className="text-sm text-ink-soft">
              {bankOnly
                ? "A IA lê o arquivo e identifica questões, matérias e assuntos — sem o PDF, o banco fica sem enunciados para a prática."
                : "A IA lê o arquivo e identifica questões, matérias e assuntos. Opcional — você pode pular e corrigir só pelas letras."}
            </p>
            <FileDrop
              label={readingExam ? "Lendo a prova…" : "Selecionar PDF da prova"}
              busy={readingExam}
              onFile={handleExamFile}
            />
            {readProgress && (
              <p className="text-sm text-sun-deep">
                {readProgress.total === null
                  ? "Preparando o PDF e calculando as partes…"
                  : `Lendo o arquivo por partes: ${readProgress.done} de ${readProgress.total} — ${readProgress.found} questões até agora.`}
                {readProgress.recovering
                  ? " Um trecho está sendo relido página por página…"
                  : ""}
              </p>
            )}
            {questions.length > 0 && (

              <div className="rounded-lg border border-line bg-paper p-4 text-sm">
                <p className="font-medium text-sun-deep">
                  {questions.length} questões identificadas
                </p>
                <ul className="mt-2 space-y-1 text-ink-soft">
                  {questions.slice(0, 5).map((q) => (
                    <li key={q.number} className="truncate">
                      {q.number}. {q.subject ?? "—"} · {q.topic ?? "—"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Gabarito oficial</h2>
            <p className="text-sm text-ink-soft">
              Envie o PDF do gabarito ou marque as alternativas corretas na mão.
            </p>
            <FileDrop
              label={readingKey ? "Lendo o gabarito…" : "Selecionar PDF do gabarito"}
              busy={readingKey}
              onFile={handleKeyFile}
            />
            <AnswerGrid numbers={numbers} answers={keyAnswers} onChange={setKeyAnswers} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Suas respostas</h2>
            {bankOnly ? (
              <p className="rounded-lg border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
                Banco de questões: não há respostas para marcar. Salve para disponibilizar as
                questões nas sessões de prática.
              </p>
            ) : questions.length > 0 ? (
              <>
                <p className="text-sm text-ink-soft">
                  Responda direto aqui. Nas questões com figura, gráfico ou tabela, abra o recorte
                  da página da prova.
                </p>
                <div className="space-y-4">
                  {numbers.map((n) => {
                    const q = questions.find((item) => item.number === n);
                    const letters = q?.options ? Object.keys(q.options) : LETTERS;
                    return (
                      <div key={n} className="rounded-lg border border-line bg-paper p-4">
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sun-deep">
                          Questão {n}
                          {q?.subject ? ` · ${q.subject}` : ""}
                          {q?.topic ? ` · ${q.topic}` : ""}
                        </p>
                        {q?.statement && (
                          <RichText className="mt-2 space-y-2 text-sm">{q.statement}</RichText>
                        )}
                        {q?.visual_summary && (
                          <div className="mt-3 rounded-lg border border-line bg-paper p-3">
                            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sun-deep">
                              Leitura da figura
                            </p>
                            <RichText className="mt-2 space-y-2 text-sm leading-relaxed">
                              {q.visual_summary}
                            </RichText>
                          </div>
                        )}
                        {(q?.has_visual || !q?.statement) && (
                          <div className="mt-3">
                            <ExamPagePreview
                              filePath={examPath}
                              page={q?.page_number ?? null}
                              label={q?.statement ? "Figura da prova" : "Enunciado no PDF"}
                            />
                            <WizardVisualReading
                              filePath={examPath}
                              number={n}
                              page={q?.page_number ?? null}
                              statement={q?.statement ?? null}
                              options={q?.options ?? null}
                              summary={q?.visual_summary ?? null}
                              onRead={(summary) =>
                                setQuestions((prev) =>
                                  prev.map((item) =>
                                    item.number === n
                                      ? { ...item, visual_summary: summary, has_visual: true }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </div>
                        )}

                        <div className="mt-3 space-y-2">
                          {letters.map((letter) => {
                            const active = myAnswers[n] === letter;
                            const text = q?.options?.[letter];
                            return (
                              <button
                                key={letter}
                                type="button"
                                aria-pressed={active}
                                onClick={() =>
                                  setMyAnswers((prev) => {
                                    const next = { ...prev };
                                    if (next[n] === letter) delete next[n];
                                    else next[n] = letter;
                                    return next;
                                  })
                                }
                                className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                                  active
                                    ? "border-sun bg-sun/10"
                                    : "border-line hover:border-sun"
                                }`}
                              >
                                <span
                                  className={`grid size-6 shrink-0 place-items-center rounded font-mono text-[11px] font-bold ${
                                    active
                                      ? "bg-sun text-primary-foreground"
                                      : "border border-line text-ink-soft"
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="min-w-0 flex-1">{text ?? "—"}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-soft">
                  Marque o que você assinalou. Deixe em branco o que não respondeu.
                </p>
                <AnswerGrid numbers={numbers} answers={myAnswers} onChange={setMyAnswers} />
              </>
            )}

          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          className="rounded-md px-4 py-2 text-sm text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
          disabled={step === 1}
          onClick={() => setStep((s) => s - 1)}
        >
          Voltar
        </button>
        {step < 4 ? (
          <button
            className="rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            onClick={() => setStep((s) => s + 1)}
          >
            Continuar
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-2 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            onClick={save}
            disabled={saving}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {saving ? "Corrigindo…" : "Corrigir simulado"}
          </button>
        )}
      </div>
    </>
  );
}

function FileDrop({
  label,
  busy,
  onFile,
}: {
  label: string;
  busy: boolean;
  onFile: (file: File) => void;
}) {
  const [source, setSource] = useState<"device" | "cloud">("device");
  const [downloading, setDownloading] = useState(false);
  const fileUrl = useServerFn(getOneDriveFileUrl);

  async function handleCloudPick(picked: { id: string; name: string; driveId: string | null }) {
    if (busy || downloading) return;
    setDownloading(true);
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
      setDownloading(false);
      onFile(file);
    } catch (err) {
      setDownloading(false);
      toast.error(errorMessage(err, "Não foi possível usar esse arquivo da nuvem."));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 rounded-full border border-line p-0.5 font-mono text-[10px]">
        {(["device", "cloud"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setSource(opt)}
            className={
              source === opt
                ? "rounded-full bg-sun px-3 py-1 font-semibold text-primary-foreground"
                : "rounded-full px-3 py-1 text-ink-soft"
            }
          >
            {opt === "device" ? "do computador" : "da nuvem"}
          </button>
        ))}
      </div>
      {source === "cloud" ? (
        <>
          {downloading && (
            <p className="flex items-center gap-2 text-sm text-sun-deep">
              <Loader2 className="size-4 animate-spin" /> Baixando o arquivo da nuvem…
            </p>
          )}
          <CloudFilePicker
            disabled={busy || downloading}
            onPick={(f) => void handleCloudPick(f)}
          />
        </>
      ) : (
        <DeviceDrop label={label} busy={busy} onFile={onFile} />
      )}
    </div>
  );
}

function DeviceDrop({
  label,
  busy,
  onFile,
}: {
  label: string;
  busy: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-paper px-4 py-10 text-sm transition-colors hover:border-sun ${
        busy ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {busy ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5 text-sun-deep" />}
      {label}
      <input
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function AnswerGrid({
  numbers,
  answers,
  onChange,
}: {
  numbers: number[];
  answers: Record<number, string>;
  onChange: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {numbers.map((n) => (
        <div key={n} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
          <span className="w-8 shrink-0 font-mono text-xs text-ink-soft">{n}.</span>
          {LETTERS.map((letter) => {
            const active = answers[n] === letter;
            return (
              <button
                key={letter}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange((prev) => {
                    const next = { ...prev };
                    if (next[n] === letter) delete next[n];
                    else next[n] = letter;
                    return next;
                  })
                }
                className={
                  active
                    ? "size-7 rounded-md bg-sun text-xs font-bold text-primary-foreground"
                    : "size-7 rounded-md border border-line text-xs text-ink-soft transition-colors hover:border-sun"
                }
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
