import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ExamPagePreview } from "@/components/ExamPagePreview";
import { supabase } from "@/integrations/supabase/client";
import { logSession } from "@/lib/study";
import { errorMessage } from "@/lib/error-message";
import { RichText } from "@/lib/text";

export const Route = createFileRoute("/simulados/$id_/fazer")({
  head: () => ({
    meta: [
      { title: "Fazer o simulado — Fichário" },
      {
        name: "description",
        content:
          "Responda a prova inteira, na ordem original, e receba a correção completa ao entregar.",
      },
      { property: "og:title", content: "Fazer o simulado — Fichário" },
      {
        property: "og:description",
        content: "Refaça uma prova salva no banco de questões do começo ao fim.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <RunExam />
    </AppShell>
  ),
});

type Row = {
  id: string;
  number: number;
  statement: string | null;
  options: Record<string, string> | null;
  correct_answer: string | null;
  subject: string | null;
  subject_id: string | null;
  topic: string | null;
  page_number: number | null;
  has_visual: boolean | null;
  visual_summary: string | null;
};

function RunExam() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [sending, setSending] = useState(false);

  const exam = useQuery({
    queryKey: ["exam", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const questions = useQuery({
    queryKey: ["exam-questions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_questions")
        .select(
          "id, number, statement, options, correct_answer, subject, subject_id, topic, page_number, has_visual, visual_summary",
        )
        .eq("exam_id", id)
        .order("number");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = useMemo(
    () => (questions.data ?? []).filter((q) => q.statement && q.options),
    [questions.data],
  );
  const current = rows[index];
  const answered = Object.keys(answers).length;

  async function submit() {
    if (!exam.data) return;
    setSending(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sessão expirada. Entre de novo.");

      const graded = rows.map((q) => {
        const mine = answers[q.id] ?? null;
        return {
          q,
          mine,
          correct: mine != null && q.correct_answer != null && mine === q.correct_answer,
        };
      });
      const correctCount = graded.filter((g) => g.correct).length;

      const { data: attempt, error: examError } = await supabase
        .from("exams")
        .insert({
          user_id: uid,
          title: `${exam.data.title} — tentativa ${new Date().toLocaleDateString("pt-BR")}`,
          exam_date: new Date().toISOString().slice(0, 10),
          status: "corrigido",
          board: exam.data.board,
          subject_id: exam.data.subject_id,
          exam_file_path: exam.data.exam_file_path,
          total_questions: rows.length,
          correct_count: correctCount,
        })
        .select("id")
        .single();
      if (examError) throw examError;

      const { data: inserted, error: cloneError } = await supabase
        .from("exam_questions")
        .insert(
          graded.map((g, i) => ({
            user_id: uid,
            exam_id: attempt.id,
            number: g.q.number ?? i + 1,
            subject: g.q.subject,
            subject_id: g.q.subject_id,
            topic: g.q.topic,
            statement: g.q.statement,
            options: g.q.options,
            correct_answer: g.q.correct_answer,
            page_number: g.q.page_number,
            has_visual: g.q.has_visual ?? false,
            visual_summary: g.q.visual_summary,
            user_answer: g.mine,
            is_correct: g.correct,
          })),
        )
        .select("id");
      if (cloneError) throw cloneError;

      const wrongIds = (inserted ?? [])
        .map((r, i) => (graded[i]?.correct ? null : r.id))
        .filter((v): v is string => Boolean(v));
      if (wrongIds.length > 0) {
        await supabase.from("error_reviews").upsert(
          wrongIds.map((qid) => ({
            question_id: qid,
            user_id: uid,
            error_type: "nao_sabia_conceito",
          })),
          { onConflict: "question_id" },
        );
      }

      await logSession({
        minutes: Math.max(1, rows.length * 2),
        correct: correctCount,
        total: rows.length,
      });

      for (const key of [
        "exams",
        "exam-errors",
        "questions",
        "revisoes",
        "subject-pending",
        "sessions",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }

      toast.success(`Prova entregue: ${correctCount}/${rows.length} acertos.`);
      void navigate({ to: "/simulados/$id", params: { id: attempt.id } });
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível entregar a prova."));
    } finally {
      setSending(false);
    }
  }

  if (exam.isLoading || questions.isLoading) {
    return <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Carregando…</p>;
  }
  if (!exam.data) return <p className="text-sm text-ink-soft">Simulado não encontrado.</p>;
  if (rows.length === 0) {
    return (
      <>
        <BackLink id={id} />
        <p className="mt-4 text-sm text-ink-soft">
          Esta prova ainda não tem questões com enunciado e alternativas para responder.
        </p>
      </>
    );
  }

  return (
    <>
      <BackLink id={id} />

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">
            Prova completa
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{exam.data.title}</h1>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft">
          {answered}/{rows.length} respondidas
        </p>
      </header>

      <div className="mt-3 h-1.5 rounded-full bg-line">
        <div
          className="h-1.5 rounded-full bg-sun transition-all"
          style={{ width: `${(answered / rows.length) * 100}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {rows.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setIndex(i)}
            className={
              i === index
                ? "size-8 rounded-md bg-sun font-mono text-[11px] font-semibold text-primary-foreground"
                : answers[q.id]
                  ? "size-8 rounded-md bg-sun/20 font-mono text-[11px] text-sun-deep"
                  : "size-8 rounded-md border border-line font-mono text-[11px] text-ink-soft transition-colors hover:border-sun"
            }
          >
            {q.number ?? i + 1}
          </button>
        ))}
      </div>

      {current && (
        <div className="mt-6 rounded-xl border border-line bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Questão {current.number ?? index + 1}
            {current.subject ? ` · ${current.subject}` : ""}
          </p>
          <RichText className="mt-3 space-y-2 text-sm leading-relaxed">
            {current.statement ?? ""}
          </RichText>

          <ExamPagePreview
            filePath={exam.data.exam_file_path}
            page={current.page_number}
            defaultOpen={Boolean(current.has_visual)}
            fallbackText={current.visual_summary ?? undefined}
          />

          <div className="mt-4 space-y-2">
            {Object.keys(current.options ?? {})
              .sort()
              .map((letter) => {
                const chosen = answers[current.id] === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => setAnswers({ ...answers, [current.id]: letter })}
                    className={
                      chosen
                        ? "flex w-full gap-3 rounded-md border border-sun bg-sun/10 px-3 py-2 text-left text-sm"
                        : "flex w-full gap-3 rounded-md border border-line px-3 py-2 text-left text-sm transition-colors hover:border-sun"
                    }
                  >
                    <span className="font-mono text-xs font-semibold text-sun-deep">{letter}</span>
                    <RichText className="flex-1">{current.options?.[letter] ?? ""}</RichText>
                  </button>
                );
              })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-sun disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setIndex((i) => Math.min(rows.length - 1, i + 1))}
              disabled={index >= rows.length - 1}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-sun disabled:opacity-40"
            >
              Próxima
            </button>
            {answers[current.id] && (
              <button
                onClick={() => {
                  const next = { ...answers };
                  delete next[current.id];
                  setAnswers(next);
                }}
                className="text-xs text-ink-soft underline-offset-2 hover:underline"
              >
                limpar resposta
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => void submit()}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Entregar prova
        </button>
        <span className="text-xs text-ink-soft">
          Questões em branco contam como erro na correção.
        </span>
      </div>
    </>
  );
}

function BackLink({ id }: { id: string }) {
  return (
    <Link
      to="/simulados/$id"
      params={{ id }}
      className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-sun-deep"
    >
      <ArrowLeft className="size-3.5" /> Voltar
    </Link>
  );
}
