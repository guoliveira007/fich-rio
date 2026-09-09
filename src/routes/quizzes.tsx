import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { QuizRunner } from "@/components/QuizRunner";
import { fetchQuestions, fetchSubjects, scopeIds, subjectTree } from "@/lib/study";

export const Route = createFileRoute("/quizzes")({
  validateSearch: (search: Record<string, unknown>): { materia?: string } => {
    const materia = typeof search["materia"] === "string" ? (search["materia"] as string) : undefined;
    return materia ? { materia } : {};
  },
  head: () => ({
    meta: [
      { title: "Quizzes — Fichário" },
      {
        name: "description",
        content: "Teste seus conhecimentos com quizzes de todas as suas matérias.",
      },
      { property: "og:title", content: "Quizzes — Fichário" },
      {
        property: "og:description",
        content: "Quiz com todas as questões cadastradas no seu fichário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <QuizzesPage />
    </AppShell>
  ),
});

function QuizzesPage() {
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: questions = [] } = useQuery({
    queryKey: ["questions", "all"],
    queryFn: () => fetchQuestions(),
  });
  const { materia } = Route.useSearch();
  const [filter, setFilter] = useState<string | null>(materia ?? null);

  const tree = useMemo(() => subjectTree(subjects), [subjects]);
  const filterIds = filter ? scopeIds(subjects, filter) : null;
  const visible = filterIds ? questions.filter((q) => filterIds.includes(q.subject_id)) : questions;
  const selected = filter ? subjects.find((s) => s.id === filter) : undefined;
  const rootId = selected?.parent_id ?? selected?.id ?? null;
  const frentes = rootId ? (tree.find((t) => t.subject.id === rootId)?.children ?? []) : [];

  const bySubject = tree.map(({ subject, children }) => {
    const ids = scopeIds(subjects, subject.id);
    return {
      subject,
      count: questions.filter((q) => ids.includes(q.subject_id)).length,
      children: children.map((f) => ({
        subject: f,
        count: questions.filter((q) => q.subject_id === f.id).length,
      })),
    };
  });

  return (
    <>
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">Teste</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Quizzes</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {questions.length} questão(ões) · {tree.length} matérias
        </p>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={
            filter === null
              ? "rounded-full bg-sun px-3 py-1.5 font-mono text-[11px] font-semibold text-primary-foreground"
              : "rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-ink-soft transition-colors hover:border-sun"
          }
        >
          todas
        </button>
        {tree.map(({ subject: s }) => {
          const ids = scopeIds(subjects, s.id);
          const count = questions.filter((q) => ids.includes(q.subject_id)).length;
          if (count === 0) return null;
          return (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={
                rootId === s.id
                  ? "flex items-center gap-1.5 rounded-full bg-sun px-3 py-1.5 font-mono text-[11px] font-semibold text-primary-foreground"
                  : "flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-ink-soft transition-colors hover:border-sun"
              }
            >
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.name} · {count}
            </button>
          );
        })}
      </div>

      {frentes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 border-l-2 border-line pl-3">
          <button
            onClick={() => setFilter(rootId)}
            className={
              filter === rootId
                ? "rounded-full bg-sun/20 px-3 py-1 font-mono text-[10px] font-semibold text-sun-deep"
                : "rounded-full border border-line px-3 py-1 font-mono text-[10px] text-ink-soft transition-colors hover:border-sun"
            }
          >
            toda a matéria
          </button>
          {frentes.map((f) => {
            const count = questions.filter((q) => q.subject_id === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={
                  filter === f.id
                    ? "rounded-full bg-sun/20 px-3 py-1 font-mono text-[10px] font-semibold text-sun-deep"
                    : "rounded-full border border-line px-3 py-1 font-mono text-[10px] text-ink-soft transition-colors hover:border-sun"
                }
              >
                {f.name.replace(/^.*\(/, "").replace(/\)$/, "")} · {count}
              </button>
            );
          })}
        </div>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuizRunner questions={visible} subjectId={filter} />
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            Questões por matéria
          </p>
          <ul className="mt-3 divide-y divide-line">
            {bySubject.map(({ subject, count, children }) =>
              count === 0 ? null : (
                <li key={subject.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: subject.color }} />
                      {subject.name}
                    </span>
                    <span className="font-mono text-[11px] text-ink-soft">{count}</span>
                  </div>
                  {children.map(({ subject: f, count: fCount }) =>
                    fCount === 0 ? null : (
                      <div
                        key={f.id}
                        className="mt-1 flex items-center justify-between pl-4 text-[13px] text-ink-soft"
                      >
                        <span>{f.name.replace(/^.*\(/, "").replace(/\)$/, "")}</span>
                        <span className="font-mono text-[10px]">{fCount}</span>
                      </div>
                    ),
                  )}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>
    </>
  );
}
