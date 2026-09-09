import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Clock, Eye, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { generateDissertativeQuestion } from "@/lib/dissertative.functions";
import { ERROR_KINDS, PRACTICE_STATUS, type ErrorKind } from "@/lib/practice";
import { dayQuestions, formatDuration, type BoardDay, type BoardRef } from "@/lib/boards";
import { logSession, type Subject } from "@/lib/study";
import { errorMessage } from "@/lib/error-message";
import { percent } from "@/lib/exam-utils";
import { RichText } from "@/lib/text";

type Loaded = {
  cloneId: string;
  statement: string;
  items: { a: string; b: string };
  expected: { a: string; b: string };
  subject: string;
};

/** Fila de matérias do dia, respeitando a quantidade de questões de cada uma. */
function buildQueue(day: BoardDay): string[] {
  const queue: string[] = [];
  for (const area of day.areas) for (let i = 0; i < area.questions; i++) queue.push(area.area);
  return queue;
}

/**
 * Simulado dissertativo (2º dia da UNIFESP): enunciado com itens a) e b),
 * espaço para escrever a resolução, resposta esperada e autocorreção.
 */
export function DissertativeRunner({
  board,
  day,
  subjects,
  onExit,
}: {
  board: BoardRef;
  day: BoardDay;
  subjects: Subject[];
  onExit: () => void;
}) {
  const queryClient = useQueryClient();
  const generate = useServerFn(generateDissertativeQuestion);
  const queue = useMemo(() => buildQueue(day), [day]);
  const total = dayQuestions(day);

  const [examId, setExamId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<{ a: string; b: string }>({ a: "", b: "" });
  const [revealed, setRevealed] = useState(false);
  const [kind, setKind] = useState<ErrorKind | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [results, setResults] = useState<boolean[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ correct: number; total: number } | null>(null);
  const [deadline] = useState(() => Date.now() + day.minutes * 60 * 1000);
  const [remaining, setRemaining] = useState(day.minutes * 60);

  // Cronômetro do dia.
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline]);

  useEffect(() => {
    if (remaining === 0 && !done && examId) {
      toast.info("Tempo do dia esgotado. Encerrando o simulado.");
      void finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // Cria o exame da sessão e carrega a primeira questão.
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) throw new Error("Sessão expirada. Entre de novo.");
        const { data: exam, error } = await supabase
          .from("exams")
          .insert({
            user_id: uid,
            title: `Simulado ${board.name} — ${day.label} (dissertativo) ${new Date().toLocaleDateString("pt-BR")}`,
            exam_date: new Date().toISOString().slice(0, 10),
            status: PRACTICE_STATUS,
            board: board.name,
            total_questions: 0,
            correct_count: 0,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (cancelled) return;
        setExamId(exam.id);
        await load(0, exam.id);
      } catch (err) {
        toast.error(errorMessage(err, "Não foi possível iniciar o simulado."));
        onExit();
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(i: number, forExamId: string) {
    const area = queue[i];
    if (!area) return;
    setLoading(true);
    setRevealed(false);
    setKind(null);
    setDrafts({ a: "", b: "" });
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sessão expirada. Entre de novo.");
      const subject = subjects.find(
        (s) => s.name.trim().toLowerCase() === area.trim().toLowerCase(),
      );
      const generated = await generate({
        data: {
          subjectId: subject?.id ?? null,
          subjectName: area,
          board: board.name,
          avoid: seen.slice(-8),
        },
      });
      // Cópia da questão nesta sessão, onde a autocorreção é gravada.
      const { data: clone, error } = await supabase
        .from("exam_questions")
        .insert({
          user_id: uid,
          exam_id: forExamId,
          number: i + 1,
          subject: area,
          subject_id: subject?.id ?? null,
          topic: generated.topic,
          statement: `${generated.statement}\n\na) ${generated.items.a}\n\nb) ${generated.items.b}`,
          options: { a: generated.expected.a, b: generated.expected.b },
          correct_answer: "dissertativa",
          user_answer: null,
          is_correct: null,
        })
        .select("id")
        .single();
      if (error) throw error;
      setQuestion({
        cloneId: clone.id,
        statement: generated.statement,
        items: generated.items,
        expected: generated.expected,
        subject: area,
      });
      setSeen((prev) => [...prev, generated.statement.slice(0, 200)]);
    } catch (err) {
      toast.error(errorMessage(err, "Não consegui montar esta questão. Tente encerrar e recomeçar."));
    } finally {
      setLoading(false);
    }
  }

  async function grade(correct: boolean) {
    if (!question) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    await supabase
      .from("exam_questions")
      .update({
        user_answer: `a) ${drafts.a}\n\nb) ${drafts.b}`.trim(),
        is_correct: correct,
      })
      .eq("id", question.cloneId);
    if (!correct && uid) {
      await supabase.from("error_reviews").upsert(
        {
          question_id: question.cloneId,
          user_id: uid,
          error_type: kind ?? "nao_sabia_conceito",
        },
        { onConflict: "question_id" },
      );
    }
    const nextResults = [...results, correct];
    setResults(nextResults);
    const nextIndex = index + 1;
    if (nextIndex >= total || !examId) {
      await finish(nextResults);
      return;
    }
    setIndex(nextIndex);
    setQuestion(null);
    await load(nextIndex, examId);
  }

  async function finish(finalResults = results) {
    if (!examId) return;
    setSaving(true);
    try {
      const correct = finalResults.filter(Boolean).length;
      await supabase
        .from("exams")
        .update({ total_questions: finalResults.length, correct_count: correct })
        .eq("id", examId);
      await logSession({
        minutes: Math.max(1, Math.round(day.minutes * (finalResults.length / total))),
        correct,
        total: finalResults.length,
      });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["exam-errors"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["revisoes"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setDone({ correct, total: finalResults.length });
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar o simulado."));
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">
          {board.name} · {day.label}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Simulado concluído</h1>
        <p className="mt-6 font-display text-6xl font-bold text-sun-deep">
          {percent(done.correct, done.total)}%
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {done.correct}/{done.total} questões dissertativas corretas na sua autocorreção
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={onExit}
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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">
          {board.name} · {day.label} · questão {Math.min(index + 1, total)} de {total}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] ${
            remaining <= 600 ? "bg-destructive/10 text-destructive" : "bg-sun/10 text-sun-deep"
          }`}
        >
          <Clock className="size-3.5" />
          {String(Math.floor(remaining / 3600)).padStart(2, "0")}:
          {String(Math.floor((remaining % 3600) / 60)).padStart(2, "0")}:
          {String(remaining % 60).padStart(2, "0")}
        </span>
        <button
          onClick={() => void finish()}
          disabled={saving}
          className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft hover:text-sun-deep disabled:opacity-50"
        >
          encerrar
        </button>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-line">
        <div
          className="h-1.5 rounded-full bg-sun transition-all"
          style={{ width: `${(results.length / total) * 100}%` }}
        />
      </div>

      {loading || !question ? (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-card p-6 text-sm text-ink-soft">
          <Loader2 className="size-4 animate-spin" /> Escrevendo a questão dissertativa de{" "}
          {queue[index] ?? "…"}…
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-line bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            {question.subject} · dissertativa
          </p>
          <RichText className="mt-3 space-y-2 text-sm leading-relaxed">
            {question.statement}
          </RichText>

          <div className="mt-5 space-y-4">
            {(["a", "b"] as const).map((item) => (
              <div key={item}>
                <p className="text-sm font-semibold">
                  {item}){" "}
                  <span className="font-normal text-ink-soft">
                    <RichText className="inline">{question.items[item]}</RichText>
                  </span>
                </p>
                <textarea
                  value={drafts[item]}
                  onChange={(e) => setDrafts({ ...drafts, [item]: e.target.value })}
                  rows={4}
                  placeholder={`Escreva a sua resolução do item ${item}…`}
                  className="mt-2 w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-sun"
                />
                {revealed && (
                  <div className="mt-2 rounded-md border border-sun/40 bg-sun/5 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sun-deep">
                      Resposta esperada — item {item}
                    </p>
                    <RichText className="mt-1 space-y-2 text-sm leading-relaxed">
                      {question.expected[item]}
                    </RichText>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Eye className="size-4" /> Ver resposta esperada
            </button>
          ) : (
            <div className="mt-5 space-y-4 border-t border-line pt-4">
              <p className="text-sm font-medium">Compare com a sua resolução: você acertou?</p>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                  Se errou, diga o motivo (entra na aba Erros da matéria)
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
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void grade(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="size-4" /> Acertei
                </button>
                <button
                  onClick={() => void grade(false)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:border-destructive disabled:opacity-50"
                >
                  <X className="size-4" /> Errei
                </button>
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                  <ArrowRight className="size-3.5" />
                  {index + 1 >= total ? "encerra o simulado" : "vai para a próxima"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-ink-soft">
        {day.label} da {board.name}: {total} questões dissertativas em {formatDuration(day.minutes)}.
        {day.note ? ` ${day.note}` : ""}
      </p>
    </div>
  );
}
