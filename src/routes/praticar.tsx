import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Clock, Loader2, Play, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { DissertativeRunner } from "@/components/DissertativeRunner";
import { ExamPagePreview } from "@/components/ExamPagePreview";
import { supabase } from "@/integrations/supabase/client";
import { fetchSubjects, logSession, scopeIds, subjectTree } from "@/lib/study";
import {
  BOARDS,
  boardById,
  dayMinutes,
  dayQuestions,
  formatDuration,
  simulationMinutes,
  type BoardDay,
} from "@/lib/boards";
import {
  BANK_STATUS,
  ERROR_KINDS,
  pickNextPractice,
  PRACTICE_STATUS,
  type ErrorKind,
  type PracticePoolQuestion,
} from "@/lib/practice";
import { percent } from "@/lib/exam-utils";
import { generateQuestionForSubject } from "@/lib/question-gen.functions";
import { cleanText, RichText } from "@/lib/text";

const searchSchema = z.object({ board: z.string().optional() });

export const Route = createFileRoute("/praticar")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Praticar questões — Fichário" },
      {
        name: "description",
        content:
          "Treino livre ou simulado direcionado a uma banca, usando seus editais e provas antigas.",
      },
      { property: "og:title", content: "Praticar questões — Fichário" },
      {
        property: "og:description",
        content: "A próxima questão é escolhida pelo tipo de erro que você acabou de cometer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <PraticarPage />
    </AppShell>
  ),
});


type ServedAnswer = {
  cloneId: string;
  answer: string;
  correct: boolean;
  kind: ErrorKind | null;
};

function PraticarPage() {
  const queryClient = useQueryClient();
  const generate = useServerFn(generateQuestionForSubject);
  const search = useSearch({ from: "/praticar" });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });

  const initialBoard = search.board ? boardById(search.board) : undefined;
  const [mode, setMode] = useState<"livre" | "banca" | "banco">(initialBoard ? "banca" : "livre");
  const [boardId, setBoardId] = useState(initialBoard?.id ?? BOARDS[0]!.id);
  const [dayId, setDayId] = useState<string | null>(initialBoard?.days?.[0]?.id ?? null);
  const [subjectId, setSubjectId] = useState("todas");
  const [count, setCount] = useState(10);
  /** Prova salva como banco escolhida para ser feita por inteiro. */
  const [bankExamId, setBankExamId] = useState<string | null>(null);
  /** Na prova completa, as questões seguem a ordem original. */
  const [sequential, setSequential] = useState(false);
  /** Dia dissertativo em andamento (UNIFESP 2º dia). */
  const [essayDay, setEssayDay] = useState<BoardDay | null>(null);
  const [starting, setStarting] = useState(false);
  const [generating, setGenerating] = useState(false);

  /** Provas salvas como banco, com o número de questões de cada uma. */
  const { data: bankExams = [] } = useQuery({
    queryKey: ["bank-exams"],
    queryFn: async () => {
      const { data: exams, error } = await supabase
        .from("exams")
        .select("id, title, board, exam_file_path, exam_date")
        .eq("status", BANK_STATUS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (exams ?? []).map((e) => e.id);
      if (ids.length === 0) return [];
      const { data: qs } = await supabase
        .from("exam_questions")
        .select("exam_id, statement, correct_answer")
        .in("exam_id", ids);
      const counts = new Map<string, number>();
      for (const q of qs ?? []) {
        if (!q.statement || !q.correct_answer) continue;
        counts.set(q.exam_id, (counts.get(q.exam_id) ?? 0) + 1);
      }
      return (exams ?? []).map((e) => ({ ...e, questions: counts.get(e.id) ?? 0 }));
    },
  });

  const selectedBank = bankExams.find((e) => e.id === bankExamId) ?? null;
  const bankBoard = selectedBank?.board
    ? (() => {
        const norm = (s: string) =>
          s
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/\([^)]*\)/g, "")
            .trim()
            .toLowerCase();
        const examBoard = norm(selectedBank.board!);
        return (
          BOARDS.find((b) => {
            const name = norm(b.name);
            return examBoard === name || examBoard.includes(name) || name.includes(examBoard);
          }) ?? null
        );
      })()
    : null;
  const bankMinutes = selectedBank
    ? bankBoard
      ? simulationMinutes(bankBoard, selectedBank.questions)
      : Math.max(1, selectedBank.questions * 3)
    : null;

  const [examId, setExamId] = useState<string | null>(null);
  const [pool, setPool] = useState<PracticePoolQuestion[]>([]);
  const [current, setCurrent] = useState<PracticePoolQuestion | null>(null);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<string | null>(null);
  const [kind, setKind] = useState<ErrorKind | null>(null);
  const [answers, setAnswers] = useState<ServedAnswer[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState<{ correct: number; total: number } | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);


  const configBoard = mode === "banca" ? boardById(boardId) : undefined;
  const configDay = configBoard?.days?.find((d) => d.id === dayId) ?? null;
  const maxQuestions = configDay ? dayQuestions(configDay) : (configBoard?.questions ?? null);
  const countOptions = maxQuestions
    ? [...new Set([10, 20, Math.round(maxQuestions / 2), maxQuestions])]
        .filter((n) => n > 0 && n <= maxQuestions)
        .sort((a, b) => a - b)
    : [10, 20, 30];
  const plannedMinutes = configDay
    ? dayMinutes(configDay, count)
    : configBoard
      ? simulationMinutes(configBoard, count)
      : null;

  // Ao trocar de banca, volta para o 1º dia (quando a prova tem dias).
  useEffect(() => {
    setDayId(configBoard?.days?.[0]?.id ?? null);
  }, [boardId, mode]);

  useEffect(() => {
    if (!maxQuestions) return;
    if (count > maxQuestions) setCount(maxQuestions);
  }, [maxQuestions, count]);

  // Cronômetro do simulado da banca.
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setTimeUp(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline]);

  useEffect(() => {
    if (timeUp && deadline && current && !finishing) {
      toast.info("Tempo da prova esgotado. Encerrando o simulado.");
      void finish(answers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const tree = subjectTree(subjects);
  const letters = (q: PracticePoolQuestion) => Object.keys(q.options).sort();

  /** Faz uma prova salva como banco por inteiro, na ordem original e no tempo de prova. */
  async function startBank() {
    if (!selectedBank) return;
    setStarting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sessão expirada.");

      const { data: questionRows, error: qError } = await supabase
        .from("exam_questions")
        .select(
          "id, number, subject_id, subject, topic, statement, options, correct_answer, page_number, has_visual, visual_summary",
        )
        .eq("exam_id", selectedBank.id)
        .order("number", { ascending: true });
      if (qError) throw qError;

      const source = (questionRows ?? [])
        .filter((q) => q.statement && q.correct_answer && q.options)
        .map((q) => ({
          subject_id: q.subject_id,
          subject: q.subject,
          topic: q.topic,
          statement: q.statement!,
          options: q.options as Record<string, string>,
          correct_answer: q.correct_answer!,
          exam_file_path: selectedBank.exam_file_path ?? null,
          page_number: q.page_number ?? null,
          has_visual: q.has_visual ?? false,
          visual_summary: q.visual_summary ?? null,
        }));
      if (source.length === 0) throw new Error("Essa prova ainda não tem questões com gabarito.");

      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert({
          user_id: uid,
          title: `${selectedBank.title} — tentativa ${new Date().toLocaleDateString("pt-BR")}`,
          exam_date: new Date().toISOString().slice(0, 10),
          status: PRACTICE_STATUS,
          board: selectedBank.board ?? null,
          exam_file_path: selectedBank.exam_file_path ?? null,
          total_questions: 0,
          correct_count: 0,
        })
        .select("id")
        .single();
      if (examError) throw examError;

      const { data: inserted, error: cloneError } = await supabase
        .from("exam_questions")
        .insert(
          source.map((q, i) => ({
            user_id: uid,
            exam_id: exam.id,
            number: i + 1,
            subject: q.subject,
            subject_id: q.subject_id,
            topic: q.topic,
            statement: q.statement,
            options: q.options,
            correct_answer: q.correct_answer,
            page_number: q.page_number,
            has_visual: q.has_visual,
            visual_summary: q.visual_summary,
            user_answer: null,
            is_correct: null,
          })),
        )
        .select("id");
      if (cloneError) throw cloneError;

      const clonedPool: PracticePoolQuestion[] = source.map((q, i) => ({
        ...q,
        id: inserted![i]!.id,
      }));
      const first = clonedPool[0]!;
      const limit = bankBoard
        ? simulationMinutes(bankBoard, clonedPool.length)
        : Math.max(1, clonedPool.length * 3);

      setSequential(true);
      setCount(clonedPool.length);
      setExamId(exam.id);
      setPool(clonedPool);
      setUsed(new Set([first.id]));
      setCurrent(first);
      setPicked(null);
      setKind(null);
      setAnswers([]);
      setDone(null);
      setTimeUp(false);
      setRemaining(limit * 60);
      setDeadline(Date.now() + limit * 60 * 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir essa prova.");
    } finally {
      setStarting(false);
    }
  }

  async function start() {
    if (mode === "banco") {
      await startBank();
      return;
    }
    setSequential(false);
    // 2º dia da UNIFESP: prova dissertativa, com tela própria.
    if (configDay?.format === "dissertativa") {
      setEssayDay(configDay);
      return;
    }

    setStarting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sessão expirada.");

      const board = mode === "banca" ? boardById(boardId) : undefined;

      // Pool: questões com enunciado do banco e de simulados já corrigidos.
      const { data: examRows, error: examsError } = await supabase
        .from("exams")
        .select("id, board, exam_file_path")
        .in("status", [BANK_STATUS, "corrigido"]);
      if (examsError) throw examsError;
      const usableExams = (examRows ?? []).filter((e) => !board || e.board === board.name);
      const examIds = usableExams.map((e) => e.id);
      const filePathByExam = new Map(usableExams.map((e) => [e.id, e.exam_file_path ?? null]));
      if (examIds.length === 0 && !board)
        throw new Error("Nenhuma questão no banco ainda. Corrija um simulado ou envie um banco.");

      const { data: questionRows, error: qError } = examIds.length
        ? await supabase
            .from("exam_questions")
            .select(
              "id, exam_id, subject_id, subject, topic, statement, options, correct_answer, source_type, page_number, has_visual, visual_summary",
            )
            .in("exam_id", examIds)
            .not("statement", "is", null)
            .not("correct_answer", "is", null)
            .limit(500)
        : { data: [], error: null };
      if (qError) throw qError;

      const ids = subjectId === "todas" ? null : scopeIds(subjects, subjectId);
      let poolAll = (questionRows ?? [])
        .filter((q) => q.statement && q.correct_answer && q.options)
        .filter((q) => !ids || (q.subject_id && ids.includes(q.subject_id)))
        .map((q) => ({
          id: q.id,
          subject_id: q.subject_id,
          subject: q.subject,
          topic: q.topic,
          statement: q.statement!,
          options: q.options as Record<string, string>,
          correct_answer: q.correct_answer!,
          exam_file_path: filePathByExam.get(q.exam_id) ?? null,
          page_number: q.page_number ?? null,
          has_visual: q.has_visual ?? false,
          visual_summary: q.visual_summary ?? null,
        }));
      // Dia específico da prova: fica só nas matérias daquele dia.
      if (configDay) {
        const areas = new Set(configDay.areas.map((a) => a.area.trim().toLowerCase()));
        const onlyDay = poolAll.filter(
          (q) => q.subject && areas.has(q.subject.trim().toLowerCase()),
        );
        if (onlyDay.length > 0) poolAll = onlyDay;
      }
      // embaralha
      poolAll = poolAll.sort(() => Math.random() - 0.5);

      // Poucas questões importadas para este assunto? Gera questões inéditas
      // a partir das fontes do aluno (edital + provas da banca) em vez de
      // repetir sempre as mesmas.
      const importedCount = (questionRows ?? []).filter(
        (q) =>
          (q.source_type ?? "imported") === "imported" &&
          (!ids || (q.subject_id && ids.includes(q.subject_id))),
      ).length;

      const norm = (v: string) =>
        v
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      // Num dia específico da prova, só valem as matérias daquele dia.
      const dayAreas = configDay?.areas.map((a) => norm(a.area)) ?? null;
      const matchesDay = (name?: string | null) => {
        if (!dayAreas) return true;
        const n = norm(name ?? "");
        if (!n) return false;
        return dayAreas.some((a) => a === n || a.includes(n) || n.includes(a));
      };

      let rootSubjects = tree.map((t) => t.subject).filter((s) => matchesDay(s.name));
      if (subjectId !== "todas") {
        const picked = subjects.find((s) => s.id === subjectId);
        const pickedRoot =
          tree.find((t) => t.subject.id === subjectId || t.children?.some((c) => c.id === subjectId))
            ?.subject ?? picked;
        rootSubjects = matchesDay(pickedRoot?.name) && picked ? [picked] : [];
      }
      const canGenerate = rootSubjects.length > 0;


      if (canGenerate && importedCount < count) {
        const missing = Math.min(count - importedCount, board ? 5 : 3);
        let boardName = board?.name ?? null;
        if (!boardName) {
          const { data: lastExam } = await supabase
            .from("exams")
            .select("board")
            .not("board", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          boardName = lastExam?.board ?? null;
        }
        setGenerating(true);
        for (let i = 0; i < missing; i++) {
          const targetId = rootSubjects[i % rootSubjects.length]!.id;

          try {
            const generated = await generate({
              data: {
                subjectId: targetId,
                ...(boardName ? { board: boardName } : {}),
              },
            });
            poolAll.push({
              id: generated.questionId,
              subject_id: targetId,
              subject: subjects.find((s) => s.id === targetId)?.name ?? null,
              topic: null,
              statement: generated.statement,
              options: generated.options,
              correct_answer: generated.correct_answer,
              exam_file_path: null,
              page_number: null,
              has_visual: false,
              visual_summary: null,
            });
            if (generated.missingStyleExamples && i === 0) {
              toast.info(
                "Gerei questões inéditas, mas ainda não tenho questões dessa banca como referência de estilo. Envie provas antigas dela em Bancas.",
              );
            }
          } catch (genErr) {
            if (i === 0 && poolAll.length === 0) throw genErr;
            break;
          }
        }
        setGenerating(false);
      }

      if (poolAll.length === 0)
        throw new Error(
          board
            ? `Ainda não tenho material da ${board.name}. Envie o edital e provas antigas em Bancas.`
            : "Não encontrei questões com enunciado para essa matéria.",
        );

      const poolSize = Math.min(poolAll.length, count * 2);
      const selected = poolAll.slice(0, poolSize);

      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert({
          user_id: uid,
          title: board
            ? `Simulado ${board.name}${configDay ? ` — ${configDay.label}` : ""} ${new Date().toLocaleDateString("pt-BR")}`
            : `Prática ${new Date().toLocaleDateString("pt-BR")}`,
          exam_date: new Date().toISOString().slice(0, 10),
          status: PRACTICE_STATUS,
          board: board?.name ?? null,
          total_questions: 0,
          correct_count: 0,
          subject_id: subjectId === "todas" ? null : subjectId,
        })
        .select("id")
        .single();
      if (examError) throw examError;


      // Garante que cada questão praticada fique ligada à frente/matéria certa,
      // para os erros aparecerem na aba Erros da frente correspondente.
      const idByName = new Map(subjects.map((s) => [s.name.trim().toLowerCase(), s.id]));
      const resolveSubjectId = (q: (typeof selected)[number]): string | null => {
        const direct = (q.subject_id as string | null) ?? null;
        if (direct) return direct;
        const byName = q.subject ? (idByName.get(q.subject.trim().toLowerCase()) ?? null) : null;
        if (byName) return byName;
        return subjectId === "todas" ? null : subjectId;
      };

      const clones = selected.map((q, i) => ({
        user_id: uid,
        exam_id: exam.id,
        number: i + 1,
        subject: q.subject ?? subjects.find((s) => s.id === resolveSubjectId(q))?.name ?? null,
        subject_id: resolveSubjectId(q),
        topic: q.topic,
        statement: q.statement,
        options: q.options,
        correct_answer: q.correct_answer,
        page_number: q.page_number ?? null,
        has_visual: q.has_visual ?? false,
        visual_summary: q.visual_summary ?? null,
        user_answer: null,
        is_correct: null,
      }));
      const { data: inserted, error: cloneError } = await supabase
        .from("exam_questions")
        .insert(clones)
        .select("id");
      if (cloneError) throw cloneError;

      // Pool passa a apontar para as cópias (onde as respostas serão gravadas).
      const clonedPool: PracticePoolQuestion[] = selected.map((q, i) => ({
        ...q,
        id: inserted![i]!.id,
      }));

      const first = clonedPool[0]!;
      setExamId(exam.id);
      setPool(clonedPool);
      setUsed(new Set([first.id]));
      setCurrent(first);
      setPicked(null);
      setKind(null);
      setAnswers([]);
      setDone(null);
      if (board) {
        const n = Math.min(count, clonedPool.length);
        const limit = configDay ? dayMinutes(configDay, n) : simulationMinutes(board, n);
        setTimeUp(false);
        setRemaining(limit * 60);
        setDeadline(Date.now() + limit * 60 * 1000);
      } else {
        setDeadline(null);
        setRemaining(null);
        setTimeUp(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível montar a prática.");
    } finally {
      setGenerating(false);
      setStarting(false);
    }
  }

  function answer(letter: string) {
    if (!current || picked) return;
    setPicked(letter);
    setKind(null);
  }

  function next() {
    if (!current || !picked) return;
    const correct = picked === current.correct_answer;
    const entry: ServedAnswer = { cloneId: current.id, answer: picked, correct, kind };
    const nextAnswers = [...answers, entry];

    if (nextAnswers.length >= count) {
      void finish(nextAnswers);
      return;
    }
    const nxt = pickNextPractice(pool, used, {
      kind: correct || sequential ? null : kind,
      subjectId: current.subject_id,
      topic: current.topic,
    });

    if (!nxt) {
      void finish(nextAnswers);
      return;
    }
    setAnswers(nextAnswers);
    setUsed(new Set([...used, nxt.id]));
    setCurrent(nxt);
    setPicked(null);
    setKind(null);
  }

  async function finish(finalAnswers: ServedAnswer[]) {
    if (!examId) return;
    setFinishing(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;

      for (const a of finalAnswers) {
        await supabase
          .from("exam_questions")
          .update({ user_answer: a.answer, is_correct: a.correct })
          .eq("id", a.cloneId);
        if (!a.correct && uid) {
          await supabase.from("error_reviews").upsert(
            {
              question_id: a.cloneId,
              user_id: uid,
              error_type: a.kind ?? "nao_sabia_conceito",
            },
            { onConflict: "question_id" },
          );
        }
      }

      const correct = finalAnswers.filter((a) => a.correct).length;
      await supabase
        .from("exams")
        .update({ total_questions: finalAnswers.length, correct_count: correct })
        .eq("id", examId);
      await logSession({ minutes: finalAnswers.length * 2, correct, total: finalAnswers.length });

      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["exam-errors"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["revisoes"] });
      queryClient.invalidateQueries({ queryKey: ["subject-pending"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setAnswers(finalAnswers);
      setDeadline(null);
      setDone({ correct, total: finalAnswers.length });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a prática.");
    } finally {
      setFinishing(false);
    }
  }

  function reset() {
    setExamId(null);
    setPool([]);
    setCurrent(null);
    setUsed(new Set());
    setPicked(null);
    setKind(null);
    setAnswers([]);
    setDone(null);
    setDeadline(null);
    setRemaining(null);
    setTimeUp(false);
    setSequential(false);
  }


  // ---------- dia dissertativo ----------
  if (essayDay && configBoard) {
    return (
      <DissertativeRunner
        board={configBoard}
        day={essayDay}
        subjects={subjects}
        onExit={() => setEssayDay(null)}
      />
    );
  }

  // ---------- tela final ----------
  if (done) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">Prática</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Sessão concluída</h1>
        <p className="mt-6 font-display text-6xl font-bold text-sun-deep">
          {percent(done.correct, done.total)}%
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {done.correct}/{done.total} acertos
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Nova sessão
          </button>
          {examId && (
            <Link
              to="/simulados/$id"
              params={{ id: examId }}
              className="rounded-md border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:border-sun"
            >
              Analisar erros desta sessão
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ---------- sessão em andamento ----------
  if (current) {
    const answered = picked !== null;
    const isCorrect = answered && picked === current.correct_answer;
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">
            Prática · questão {answers.length + 1} de {count}
          </p>
          {remaining !== null && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] ${
                remaining <= 300 ? "bg-destructive/10 text-destructive" : "bg-sun/10 text-sun-deep"
              }`}
            >
              <Clock className="size-3.5" />
              {String(Math.floor(remaining / 3600)).padStart(2, "0")}:
              {String(Math.floor((remaining % 3600) / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
          )}
          <button
            onClick={() => void finish(answers)}
            disabled={finishing}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft hover:text-sun-deep disabled:opacity-50"
          >
            encerrar
          </button>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-line">
          <div
            className="h-1.5 rounded-full bg-sun transition-all"
            style={{ width: `${(answers.length / count) * 100}%` }}
          />
        </div>

        <div className="mt-6 rounded-xl border border-line bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            {current.subject ?? "Sem matéria"}
            {current.topic ? ` · ${current.topic}` : ""}
          </p>
          <RichText className="mt-3 space-y-2 text-sm leading-relaxed">{current.statement}</RichText>

          {current.has_visual && (
            <div className="mt-4">
              <ExamPagePreview
                filePath={current.exam_file_path ?? null}
                page={current.page_number ?? null}
                label="Figura da questão"
                defaultOpen
                fallbackText={current.visual_summary ?? null}
              />
            </div>
          )}

          <div className="mt-5 space-y-2">
            {letters(current).map((letter) => {
              const isPicked = picked === letter;
              const isRight = letter === current.correct_answer;
              let cls =
                "flex w-full items-start gap-3 rounded-lg border border-line px-4 py-3 text-left text-sm transition-colors hover:border-sun";
              if (answered && isRight)
                cls =
                  "flex w-full items-start gap-3 rounded-lg border border-sun bg-sun/10 px-4 py-3 text-left text-sm";
              else if (answered && isPicked)
                cls =
                  "flex w-full items-start gap-3 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-left text-sm";
              else if (answered)
                cls =
                  "flex w-full items-start gap-3 rounded-lg border border-line px-4 py-3 text-left text-sm opacity-60";
              return (
                <button key={letter} onClick={() => answer(letter)} disabled={answered} className={cls}>
                  <span className="font-mono text-xs font-bold">{letter}</span>
                  <RichText className="min-w-0 flex-1">{current.options[letter] ?? ""}</RichText>
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="mt-5 space-y-4 border-t border-line pt-4">
              <p className={`flex items-center gap-2 text-sm font-semibold ${isCorrect ? "text-sun-deep" : "text-destructive"}`}>
                {isCorrect ? <Check className="size-4" /> : <X className="size-4" />}
                {isCorrect ? "Resposta certa!" : `Era a alternativa ${current.correct_answer}.`}
              </p>

              {!isCorrect && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                    Por que você errou? (define a próxima questão)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ERROR_KINDS.map((k) => (
                      <button
                        key={k.id}
                        onClick={() => setKind(k.id)}
                        className={
                          kind === k.id
                            ? "rounded-full bg-sun px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                            : "rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-sun"
                        }
                        title={k.hint}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={next}
                disabled={(answered && !isCorrect && !kind && !sequential) || finishing}
                className="inline-flex items-center gap-2 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {finishing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                {answers.length + 1 >= count ? "Encerrar sessão" : "Próxima questão"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- configuração ----------
  return (
    <>
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">Treino</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Praticar</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Treino livre com o seu banco, ou simulado no estilo de uma banca — usando o edital e as
          provas antigas que você enviou. A próxima questão se adapta ao tipo de erro que você
          acabou de cometer.
        </p>
      </header>

      <div className="mt-8 max-w-xl rounded-xl border border-line bg-card p-6">
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { id: "livre", label: "Treino livre", hint: "questões do seu banco" },
              { id: "banca", label: "Simulado da banca", hint: "no estilo da prova" },
              { id: "banco", label: "Prova completa", hint: "uma prova salva, inteira" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={
                mode === m.id
                  ? "rounded-lg border border-sun bg-sun/10 px-3 py-2 text-left"
                  : "rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-sun"
              }
            >
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="block font-mono text-[10px] text-ink-soft">{m.hint}</span>
            </button>
          ))}
        </div>

        {mode === "banco" && (
          <div className="mt-4">
            <span className="text-sm font-medium">Prova salva</span>
            {bankExams.length === 0 ? (
              <p className="mt-2 text-xs text-ink-soft">
                Você ainda não salvou nenhuma prova como banco. Envie uma em Simulados e marque
                como banco de questões.
              </p>
            ) : (
              <>
                <div className="mt-2 grid gap-2">
                  {bankExams.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setBankExamId(e.id)}
                      className={
                        bankExamId === e.id
                          ? "rounded-lg border border-sun bg-sun/10 px-3 py-2 text-left"
                          : "rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-sun"
                      }
                    >
                      <span className="block text-sm font-semibold">{e.title}</span>
                      <span className="block font-mono text-[10px] text-ink-soft">
                        {e.questions} questões{e.board ? ` · ${e.board}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedBank && bankMinutes !== null && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-soft">
                    <Clock className="size-3.5" />
                    Prova inteira: {selectedBank.questions} questões em{" "}
                    {formatDuration(bankMinutes)}
                    {bankBoard
                      ? ` — mesmo ritmo da ${bankBoard.name}.`
                      : " — 3 minutos por questão."}
                  </p>
                )}
              </>
            )}
          </div>
        )}



        {mode === "banca" && (
          <div className="mt-4">
            <span className="text-sm font-medium">Banca</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {BOARDS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBoardId(b.id)}
                  className={
                    boardId === b.id
                      ? "rounded-full bg-sun px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      : "rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-sun"
                  }
                >
                  {b.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {configBoard?.reference}. As questões saem das provas dessa banca que você
              enviou; se faltarem, a IA cria questões inéditas seguindo o edital e o estilo dela.
            </p>

            {configBoard?.days && configBoard.days.length > 0 && (
              <div className="mt-4">
                <span className="text-sm font-medium">Dia da prova</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {configBoard.days.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setDayId(d.id);
                        setCount(dayQuestions(d));
                      }}
                      className={
                        dayId === d.id
                          ? "rounded-lg border border-sun bg-sun/10 px-3 py-2 text-left"
                          : "rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-sun"
                      }
                    >
                      <span className="block text-sm font-semibold">{d.label}</span>
                      <span className="block font-mono text-[10px] text-ink-soft">
                        {dayQuestions(d)} {d.format === "dissertativa" ? "dissertativas" : "objetivas"} ·{" "}
                        {formatDuration(d.minutes)}
                      </span>
                      <span className="mt-1 block text-[11px] text-ink-soft">
                        {d.areas.map((a) => `${a.questions} ${a.area}`).join(" · ")}
                      </span>
                    </button>
                  ))}
                </div>
                {configDay?.note && (
                  <p className="mt-2 text-xs text-ink-soft">{configDay.note}</p>
                )}
              </div>
            )}
          </div>
        )}

        <label
          className={`mt-4 block text-sm ${configDay?.format === "dissertativa" || mode === "banco" ? "hidden" : ""}`}
        >
          <span className="font-medium">Matéria</span>


          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-sun"
          >
            <option value="todas">Todas as matérias</option>
            {tree.map(({ subject: s, children }) =>
              children.length === 0 ? (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ) : (
                <optgroup key={s.id} label={s.name}>
                  <option value={s.id}>{s.name} (tudo)</option>
                  {children.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              ),
            )}
          </select>
        </label>

        <div className={`mt-4 ${configDay?.format === "dissertativa" || mode === "banco" ? "hidden" : ""}`}>
          <span className="text-sm font-medium">Quantidade</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {countOptions.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={
                  count === n
                    ? "rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground"
                    : "rounded-md border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:border-sun"
                }
              >
                {n} questões
              </button>
            ))}
          </div>
          {configBoard && plannedMinutes !== null && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-soft">
              <Clock className="size-3.5" />
              Tempo desta sessão: {formatDuration(plannedMinutes)} — mesmo ritmo{" "}
              {configDay
                ? `do ${configDay.label} da ${configBoard.name} (${dayQuestions(configDay)} questões em ${formatDuration(configDay.minutes)})`
                : `da ${configBoard.name} (${configBoard.questions} questões em ${formatDuration(configBoard.minutes)})`}
              .
            </p>
          )}
        </div>

        {configDay?.format === "dissertativa" && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <Clock className="size-3.5" />
            {configDay.label} completo: {dayQuestions(configDay)} questões dissertativas em{" "}
            {formatDuration(configDay.minutes)}, com os itens a) e b) em cada uma.
          </p>
        )}


        <button
          onClick={start}
          disabled={starting || (mode === "banco" && !selectedBank)}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-sun px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {generating
            ? "Criando questões inéditas…"
            : starting
              ? "Montando sua sessão…"
              : "Começar"}
        </button>
        <p className="mt-3 text-xs text-ink-soft">
          A sessão cria um exame com status “prática”, que não aparece na lista de simulados.
        </p>
      </div>
    </>
  );
}
