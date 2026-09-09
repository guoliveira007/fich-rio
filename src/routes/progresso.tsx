import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { fetchSubjects, scopeIds, subjectTree } from "@/lib/study";
import { percent } from "@/lib/exam-utils";
import { extractEditalTopics } from "@/lib/edital-topics.functions";

export const Route = createFileRoute("/progresso")({
  head: () => ({
    meta: [
      { title: "Progresso por matéria — Fichário" },
      {
        name: "description",
        content:
          "Quantas questões você respondeu, acertou e errou em cada matéria, e quantos assuntos do edital ainda faltam.",
      },
      { property: "og:title", content: "Progresso por matéria — Fichário" },
      {
        property: "og:description",
        content: "Acompanhe acertos, erros e o que ainda falta do edital em cada matéria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <ProgressoPage />
    </AppShell>
  ),
});

type QuestionRow = {
  subject_id: string | null;
  topic: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
};

type TopicRow = { subject_id: string; topic: string; board: string | null };

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Um assunto do edital conta como iniciado quando há questão respondida com tópico parecido. */
function topicDone(topic: string, answeredTopics: string[]) {
  const key = normalize(topic);
  if (!key) return false;
  return answeredTopics.some((t) => t.includes(key) || key.includes(t));
}

function ProgressoPage() {
  const queryClient = useQueryClient();
  const extract = useServerFn(extractEditalTopics);
  const [loadingSubject, setLoadingSubject] = useState<string | null>(null);

  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });

  const { data: questions = [] } = useQuery({
    queryKey: ["progress-questions"],
    queryFn: async (): Promise<QuestionRow[]> => {
      const { data, error } = await supabase
        .from("exam_questions")
        .select("subject_id, topic, user_answer, is_correct");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: topics = [] } = useQuery({
    queryKey: ["edital-topics"],
    queryFn: async (): Promise<TopicRow[]> => {
      const { data, error } = await supabase
        .from("edital_topics")
        .select("subject_id, topic, board")
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  async function readEdital(subjectId: string, ids: string[]) {
    setLoadingSubject(subjectId);
    try {
      const res = await extract({ data: { subjectIds: ids } });
      toast.success(`${res.count} assuntos do edital importados.`);
      await queryClient.invalidateQueries({ queryKey: ["edital-topics"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui ler o edital.");
    } finally {
      setLoadingSubject(null);
    }
  }

  const tree = subjectTree(subjects);

  const totals = questions.reduce(
    (acc, q) => {
      if (!q.user_answer) return acc;
      acc.answered += 1;
      if (q.is_correct === true) acc.correct += 1;
      else acc.wrong += 1;
      return acc;
    },
    { answered: 0, correct: 0, wrong: 0 },
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-sun-deep">Progresso</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Progresso por matéria</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Quantas questões você respondeu, acertou e errou em cada matéria — e quantos assuntos do
          edital ainda não apareceram nas suas questões.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Respondidas", value: totals.answered },
          { label: "Acertos", value: totals.correct },
          { label: "Erros", value: totals.wrong },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-line bg-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
              {card.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {tree.length === 0 && (
          <p className="text-sm text-ink-soft">
            Crie suas matérias primeiro para acompanhar o progresso.
          </p>
        )}

        {tree.map(({ subject }) => {
          const ids = scopeIds(subjects, subject.id);
          const mine = questions.filter((q) => q.subject_id && ids.includes(q.subject_id));
          const answered = mine.filter((q) => q.user_answer);
          const correct = answered.filter((q) => q.is_correct === true).length;
          const wrong = answered.length - correct;

          const answeredTopics = [
            ...new Set(answered.map((q) => normalize(q.topic ?? "")).filter(Boolean)),
          ];
          const editalTopics = topics.filter((t) => ids.includes(t.subject_id));
          const done = editalTopics.filter((t) => topicDone(t.topic, answeredTopics));
          const missing = editalTopics.filter((t) => !topicDone(t.topic, answeredTopics));
          const board = editalTopics.find((t) => t.board)?.board ?? null;

          return (
            <section key={subject.id} className="rounded-xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: subject.color }}
                    aria-hidden
                  />
                  <h2 className="font-display text-xl font-bold tracking-tight">{subject.name}</h2>
                </div>
                <Link
                  to="/praticar"
                  className="text-sm font-semibold text-sun-deep hover:underline"
                >
                  Praticar esta matéria
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Respondidas" value={answered.length} />
                <Stat label="Acertos" value={correct} tone="ok" />
                <Stat label="Erros" value={wrong} tone="bad" />
                <Stat
                  label="Aproveitamento"
                  value={answered.length ? `${percent(correct, answered.length)}%` : "—"}
                />
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper">
                <div
                  className="h-full bg-sun"
                  style={{
                    width: `${answered.length ? percent(correct, answered.length) : 0}%`,
                  }}
                />
              </div>

              <div className="mt-5 border-t border-line pt-4">
                {editalTopics.length === 0 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-ink-soft">
                      Nenhum assunto de edital importado para esta matéria.
                    </p>
                    <button
                      type="button"
                      onClick={() => readEdital(subject.id, ids)}
                      disabled={loadingSubject === subject.id}
                      className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm font-semibold transition-colors hover:border-sun disabled:opacity-50"
                    >
                      {loadingSubject === subject.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                      Ler o edital desta matéria
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sun-deep">
                      Edital{board ? ` · ${board}` : ""} — {done.length} de {editalTopics.length}{" "}
                      assuntos já praticados, faltam {missing.length}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {editalTopics.slice(0, 40).map((t) => {
                        const ok = topicDone(t.topic, answeredTopics);
                        return (
                          <li
                            key={`${t.subject_id}-${t.topic}`}
                            className={
                              ok
                                ? "inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink-soft"
                                : "inline-flex items-center gap-1 rounded-full border border-sun/50 bg-sun/10 px-2.5 py-1 text-xs font-medium"
                            }
                          >
                            {ok ? <Check className="size-3" /> : <X className="size-3" />}
                            {t.topic}
                          </li>
                        );
                      })}
                    </ul>
                    {editalTopics.length > 40 && (
                      <p className="mt-2 text-xs text-ink-soft">
                        e mais {editalTopics.length - 40} assuntos do edital.
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "ok" | "bad";
}) {
  return (
    <div className="rounded-lg border border-line bg-paper p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">{label}</p>
      <p
        className={
          tone === "ok"
            ? "mt-1 font-display text-xl font-bold text-sun-deep"
            : tone === "bad"
              ? "mt-1 font-display text-xl font-bold text-destructive"
              : "mt-1 font-display text-xl font-bold"
        }
      >
        {value}
      </p>
    </div>
  );
}
