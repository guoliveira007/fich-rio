import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ExamPagePreview } from "@/components/ExamPagePreview";
import { ErrorAnalysis, type AnalyzableQuestion } from "@/components/ErrorAnalysis";
import {
  answerItem,
  ensureReviewQuestion,
  fetchExerciseList,
  type ExerciseListItem,
} from "@/lib/exercise-lists";
import { matchSubjectId } from "@/lib/exam-link";
import { fetchSubjects } from "@/lib/study";
import { LETTERS } from "@/lib/exam-utils";
import { RichText } from "@/lib/text";

export const Route = createFileRoute("/listas/$id")({
  head: () => ({
    meta: [
      { title: "Lista de exercícios — Fichário" },
      {
        name: "description",
        content: "Resolva a lista de exercícios da aula com correção automática questão por questão.",
      },
      { property: "og:title", content: "Lista de exercícios — Fichário" },
      {
        property: "og:description",
        content: "Lista da aula em formato de simulado, com gabarito e marcação de progresso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <ListaPage />
    </AppShell>
  ),
});

function ListaPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: list, isLoading } = useQuery({
    queryKey: ["exercise-list", id],
    queryFn: () => fetchExerciseList(id),
  });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  async function mark(item: ExerciseListItem, letter: string) {
    const next = item.user_answer === letter ? null : letter;
    try {
      await answerItem(item, next);
      setRevealed((prev) => ({ ...prev, [item.id]: next !== null }));
      queryClient.invalidateQueries({ queryKey: ["exercise-list", id] });
      queryClient.invalidateQueries({ queryKey: ["exercise-lists"] });
    } catch {
      toast.error("Não foi possível salvar a resposta.");
    }
  }

  if (isLoading) return <p className="text-sm text-ink-soft">Carregando lista…</p>;
  if (!list) return <p className="text-sm text-ink-soft">Lista não encontrada.</p>;

  const answered = list.items.filter((i) => i.user_answer);
  const correct = answered.filter((i) => i.is_correct === true).length;

  return (
    <>
      <header>
        <Link
          to="/aulas"
          className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-soft hover:text-sun-deep"
        >
          <ArrowLeft className="size-3.5" /> voltar para aulas
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{list.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {list.lesson_title ? `${list.lesson_title} · ` : ""}
          {answered.length}/{list.items.length} respondidas · {correct} certas
        </p>
      </header>

      <div className="mt-6 space-y-4">
        {list.items.map((item) => {
          const letters = item.options ? Object.keys(item.options) : LETTERS;
          const show = revealed[item.id] || item.user_answer !== null;
          return (
            <article key={item.id} className="rounded-xl border border-line bg-card p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sun-deep">
                Questão {item.number}
              </p>
              {item.statement && <RichText className="mt-2 space-y-2 text-sm">{item.statement}</RichText>}
              {(item.has_visual || !item.statement) && (
                <div className="mt-3">
                  <ExamPagePreview
                    filePath={list.file_path}
                    page={item.page_number}
                    label={item.statement ? "Figura da lista" : "Enunciado no PDF"}
                    fallbackText={item.visual_summary}
                  />
                </div>
              )}

              <div className="mt-3 space-y-2">
                {letters.map((letter) => {
                  const active = item.user_answer === letter;
                  const isRight = item.correct_answer === letter;
                  const tone =
                    show && isRight
                      ? "border-emerald-500 bg-emerald-500/10"
                      : active
                        ? item.is_correct === false
                          ? "border-destructive bg-destructive/10"
                          : "border-sun bg-sun/10"
                        : "border-line hover:border-sun";
                  return (
                    <button
                      key={letter}
                      type="button"
                      aria-pressed={active}
                      onClick={() => void mark(item, letter)}
                      className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${tone}`}
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded border border-line font-mono text-[11px] font-bold">
                        {letter}
                      </span>
                      <RichText className="min-w-0 flex-1">
                        {item.options?.[letter] ?? "—"}
                      </RichText>
                    </button>
                  );
                })}
              </div>

              {show && item.correct_answer && (
                <p className="mt-3 flex items-center gap-2 text-sm">
                  {item.is_correct ? (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-600" /> Você acertou.
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-destructive" /> Resposta correta:{" "}
                      {item.correct_answer}
                    </>
                  )}
                </p>
              )}
              {show && !item.correct_answer && (
                <p className="mt-3 text-xs text-ink-soft">
                  Esta lista veio sem gabarito, então a questão fica só marcada como feita.
                </p>
              )}

              {show && item.is_correct === false && (
                <ItemReview list={list} item={item} />
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

/** Abre a análise de erro da plataforma para uma questão errada da lista. */
function ItemReview({
  list,
  item,
}: {
  list: { id: string; title: string; subject: string | null };
  item: ExerciseListItem;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState<AnalyzableQuestion | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const subjects = await fetchSubjects();
      const subjectId = matchSubjectId(subjects, list.subject, null);
      const row = await ensureReviewQuestion(list, item, subjectId);
      setQuestion({
        id: row.id,
        number: item.number,
        subject_id: row.subject_id ?? null,
        subject: row.subject ?? list.subject,
        topic: row.topic ?? null,
        statement: item.statement,
        correct_answer: item.correct_answer,
        user_answer: item.user_answer,
      });
      setOpen(true);
    } catch {
      toast.error("Não foi possível abrir a revisão desta questão.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !question) {
    return (
      <button
        onClick={() => void start()}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-sun disabled:opacity-60"
      >
        <Sparkles className="size-4 text-sun-deep" />
        {busy ? "Abrindo…" : "Revisar este erro"}
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-paper p-4">
      <ErrorAnalysis question={question} onCancel={() => setOpen(false)} />
    </div>
  );
}
