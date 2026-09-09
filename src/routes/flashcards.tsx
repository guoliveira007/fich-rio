import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Layers, Plus, Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { FlashcardReview } from "@/components/FlashcardReview";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchFlashcards,
  fetchSubjects,
  isDue,
  scopeIds,
  subjectTree,
  type Flashcard,
} from "@/lib/study";

/** Nome legível de cada aula/material que originou os cartões. */
async function fetchLessonLabels() {
  const labels: Record<string, string> = {};
  const [summaries, custom, materials] = await Promise.all([
    supabase.from("lesson_summaries").select("lesson_id, lesson_title"),
    supabase.from("custom_lessons").select("id, title"),
    supabase.from("materials").select("lesson_id, lesson_ids, title"),
  ]);
  for (const m of materials.data ?? []) {
    const ids = m.lesson_ids?.length ? m.lesson_ids : m.lesson_id ? [m.lesson_id] : [];
    for (const id of ids) if (id && !labels[id]) labels[id] = m.title;
  }
  for (const c of custom.data ?? []) if (c.title) labels[c.id] = c.title;
  for (const s of summaries.data ?? []) if (s.lesson_title) labels[s.lesson_id] = s.lesson_title;
  return labels;
}


export const Route = createFileRoute("/flashcards")({
  validateSearch: (search: Record<string, unknown>): { materia?: string } => {
    const materia = typeof search["materia"] === "string" ? (search["materia"] as string) : undefined;
    return materia ? { materia } : {};
  },
  head: () => ({
    meta: [
      { title: "Flashcards — Fichário" },
      {
        name: "description",
        content: "Revise todos os seus flashcards de uma vez, agrupados por matéria.",
      },
      { property: "og:title", content: "Flashcards — Fichário" },
      {
        property: "og:description",
        content: "Revisão espaçada de flashcards para o ENEM e vestibulares.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <FlashcardsPage />
    </AppShell>
  ),
});

function boxStats(cards: Flashcard[]) {
  const buckets = [1, 2, 3, 4, 5, 6].map((box) => ({
    box,
    count: cards.filter((c) => Math.min(c.box, 6) === box).length,
  }));
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return { buckets, max };
}

function FlashcardsPage() {
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: cards = [] } = useQuery({
    queryKey: ["flashcards", "all"],
    queryFn: () => fetchFlashcards(),
  });
  const { materia } = Route.useSearch();
  const [filter, setFilter] = useState<string | null>(materia ?? null);
  const [lessonFilter, setLessonFilter] = useState<string | null>(null);
  const { data: lessonNames = {} } = useQuery({
    queryKey: ["lesson-labels"],
    queryFn: fetchLessonLabels,
    staleTime: 5 * 60 * 1000,
  });

  // trocar de matéria limpa a aula escolhida
  useEffect(() => setLessonFilter(null), [filter]);

  const subjectNames = useMemo(
    () =>
      Object.fromEntries(subjects.map((s) => [s.id, { name: s.name, color: s.color }])) as Record<
        string,
        { name: string; color: string }
      >,
    [subjects],
  );

  const tree = useMemo(() => subjectTree(subjects), [subjects]);
  const filterIds = filter ? scopeIds(subjects, filter) : null;
  const inSubject = filterIds ? cards.filter((c) => filterIds.includes(c.subject_id)) : cards;

  const lessonOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of inSubject) {
      if (c.lesson_id) counts.set(c.lesson_id, (counts.get(c.lesson_id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, label: lessonNames[id] ?? "Aula sem nome" }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [inSubject, lessonNames]);

  const visible =
    lessonFilter === null
      ? inSubject
      : lessonFilter === "__none__"
        ? inSubject.filter((c) => !c.lesson_id)
        : inSubject.filter((c) => c.lesson_id === lessonFilter);

  const withoutLesson = inSubject.filter((c) => !c.lesson_id).length;
  const selected = filter ? subjects.find((s) => s.id === filter) : undefined;
  const rootId = selected?.parent_id ?? selected?.id ?? null;
  const frentes = rootId ? (tree.find((t) => t.subject.id === rootId)?.children ?? []) : [];


  const due = visible.filter((c) => isDue(c)).length;
  const mastered = visible.filter((c) => c.box >= 5).length;
  const reviews = visible.reduce((acc, c) => acc + c.reviews, 0);
  const { buckets, max } = boxStats(visible);

  return (
    <>
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">Revisão</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Flashcards</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {cards.length} cartões no fichário · {tree.length} matérias
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
          const count = cards.filter((c) => ids.includes(c.subject_id)).length;
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
            const count = cards.filter((c) => c.subject_id === f.id).length;
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

      {lessonOptions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label
            htmlFor="filtro-aula"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft"
          >
            Aula de origem
          </label>
          <select
            id="filtro-aula"
            value={lessonFilter ?? ""}
            onChange={(e) => setLessonFilter(e.target.value === "" ? null : e.target.value)}
            className="max-w-full rounded-md border border-line bg-card px-3 py-1.5 text-sm outline-none focus:border-sun"
          >
            <option value="">Todas as aulas ({inSubject.length})</option>
            {lessonOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label} ({l.count})
              </option>
            ))}
            {withoutLesson > 0 && (
              <option value="__none__">Sem aula ligada ({withoutLesson})</option>
            )}
          </select>
          {lessonFilter && (
            <button
              onClick={() => setLessonFilter(null)}
              className="rounded-full border border-line px-3 py-1 font-mono text-[10px] text-ink-soft transition-colors hover:border-sun"
            >
              limpar
            </button>
          )}
        </div>
      )}


      <section className="mt-5 grid gap-4 sm:grid-cols-4">
        {[
          ["Para hoje", due],
          ["Dominados", mastered],
          ["No filtro", visible.length],
          ["Revisões feitas", reviews],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-line bg-card p-4">
            <p className="font-display text-2xl font-bold">{value as number}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              {label as string}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FlashcardReview
            cards={visible}
            subjectId={filter}
            scopeKey={lessonFilter ?? "all-lessons"}
            subjectNames={subjectNames}
          />

        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              Domínio por caixa (Leitner)
            </p>
            <div className="mt-4 flex h-28 items-end gap-2">
              {buckets.map((b) => (
                <div key={b.box} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-mono text-[10px] text-ink-soft">{b.count}</span>
                  <div
                    className="w-full rounded-t bg-sun/70"
                    style={{ height: `${(b.count / max) * 76 + 4}px` }}
                  />
                  <span className="font-mono text-[9px] text-ink-soft">{b.box}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              Por matéria
            </p>
            <ul className="mt-3 divide-y divide-line">
              {tree.map(({ subject: s, children }) => {
                const ids = scopeIds(subjects, s.id);
                const sc = cards.filter((c) => ids.includes(c.subject_id));
                if (sc.length === 0) return null;
                const sDue = sc.filter((c) => isDue(c)).length;
                return (
                  <li key={s.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </span>
                      <span className="font-mono text-[11px] text-ink-soft">
                        {sDue > 0 ? `${sDue} hoje · ` : ""}
                        {sc.length} cards
                      </span>
                    </div>
                    {children.map((f) => {
                      const fc = cards.filter((c) => c.subject_id === f.id);
                      if (fc.length === 0) return null;
                      const fDue = fc.filter((c) => isDue(c)).length;
                      return (
                        <div
                          key={f.id}
                          className="mt-1 flex items-center justify-between pl-4 text-[13px] text-ink-soft"
                        >
                          <span>{f.name.replace(/^.*\(/, "").replace(/\)$/, "")}</span>
                          <span className="font-mono text-[10px]">
                            {fDue > 0 ? `${fDue} hoje · ` : ""}
                            {fc.length}
                          </span>
                        </div>
                      );
                    })}
                  </li>
                );
              })}
            </ul>

          </div>
        </div>
      </section>
    </>
  );
}
