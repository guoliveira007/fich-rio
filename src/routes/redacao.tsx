import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BookOpen, Check, Clock, ListChecks, Loader2, PenLine, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/error-message";
import { RichText } from "@/lib/text";
import { generateEssayTheme, gradeEssay } from "@/lib/redacao.functions";
import {
  BOARDS,
  HIGH_SCORE_LESSONS,
  PART_DRILLS,
  STARTER_THEMES,

  getBoard,
  getPart,
  type BoardId,
  type EssayPart,
} from "@/data/redacao-guide";
import { REAL_THEMES } from "@/data/redacao-corpus";
import cartilha from "@/assets/cartilha-redacoes.pdf.asset.json";

export const Route = createFileRoute("/redacao")({
  head: () => ({
    meta: [
      { title: "Redação FUVEST, UNIFESP e ENEM — treino por parágrafo | Fichário" },
      {
        name: "description",
        content:
          "Treine a redação de cada banca: proposta com coletânea, cronômetro, correção pelos critérios oficiais e treino isolado de introdução, desenvolvimento e conclusão.",
      },
      { property: "og:title", content: "Redação FUVEST, UNIFESP e ENEM — treino por parágrafo" },
      {
        property: "og:description",
        content: "Escreva, receba correção pelos critérios da banca e treine a técnica de cada parágrafo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <RedacaoPage />
    </AppShell>
  ),
});

type CriterionScore = { id: string; label: string; score: number; max: number; comment: string };

type EssayRow = {
  id: string;
  board: string;
  theme_title: string;
  theme_prompt: string;
  text: string;
  status: string;
  score: number | null;
  max_score: number | null;
  criteria: unknown;
  strengths: unknown;
  improvements: unknown;
  feedback: string;
  rewritten: string;
  minutes: number;
  mode: string | null;
  part: string | null;
  created_at: string;
};

const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
const asCriteria = (v: unknown): CriterionScore[] =>
  Array.isArray(v) ? (v as CriterionScore[]).filter((c) => c && typeof c === "object" && "label" in c) : [];

const countWords = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

async function fetchEssays(): Promise<EssayRow[]> {
  const { data, error } = await supabase
    .from("essays")
    .select(
      "id, board, theme_title, theme_prompt, text, status, score, max_score, criteria, strengths, improvements, feedback, rewritten, minutes, mode, part, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as unknown as EssayRow[];
}

function RedacaoPage() {
  const queryClient = useQueryClient();
  const generate = useServerFn(generateEssayTheme);
  const grade = useServerFn(gradeEssay);

  const { data: essays = [], isLoading } = useQuery({ queryKey: ["essays"], queryFn: fetchEssays });

  const [openId, setOpenId] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardId>("FUVEST");
  const [mode, setMode] = useState<"completa" | "paragrafo">("completa");
  const [part, setPart] = useState<EssayPart>("introducao");
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);

  const current = essays.find((e) => e.id === openId) ?? null;
  const activeBoard = getBoard(board);
  const activeDrill = getPart(part);

  const scoped = essays.filter((e) => e.board === board && (e.mode ?? "completa") === mode);
  const corrected = scoped.filter((e) => e.status === "corrigida" && e.score != null);
  const average = corrected.length
    ? Math.round((corrected.reduce((s, e) => s + Number(e.score), 0) / corrected.length) * 10) / 10
    : null;
  const best = corrected.length ? Math.max(...corrected.map((e) => Number(e.score))) : null;
  const scale = mode === "paragrafo" ? 10 : activeBoard.maxScore;

  async function createTheme(exactTitle?: string) {
    setCreating(true);
    try {
      const theme = await generate({
        data: {
          board,
          mode,
          part: mode === "paragrafo" ? part : undefined,
          exactTitle,
          topic: exactTitle ? undefined : topic.trim() || undefined,
          avoid: essays.slice(0, 10).map((e) => e.theme_title),
        },
      });
      setTopic("");
      await queryClient.invalidateQueries({ queryKey: ["essays"] });
      setOpenId(theme.essayId);
    } catch (err) {
      toast.error(errorMessage(err, "Não consegui montar a proposta agora."));
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("essays").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível apagar esta redação.");
      return;
    }
    if (openId === id) setOpenId(null);
    queryClient.invalidateQueries({ queryKey: ["essays"] });
  }

  if (current) {
    return (
      <EssayWorkspace
        essay={current}
        onBack={() => setOpenId(null)}
        onGrade={async (minutes) => {
          await grade({ data: { essayId: current.id, minutes } });
          await queryClient.invalidateQueries({ queryKey: ["essays"] });
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">
        FUVEST · UNIFESP · ENEM
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Redação</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Escolha a banca e treine: ou a redação inteira, com cronômetro e correção nos critérios
        oficiais, ou um parágrafo por vez, seguindo a técnica de introdução, desenvolvimento e
        conclusão. A ideia é repetir até virar automático.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {BOARDS.map((b) => (
          <button
            key={b.id}
            onClick={() => setBoard(b.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              board === b.id
                ? "border-sun bg-sun/10 text-sun-deep"
                : "border-line text-ink-soft hover:border-sun"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {activeBoard.style} Nota até {activeBoard.maxScore}, {activeBoard.lines}.
      </p>

      <div className="mt-5 inline-flex rounded-lg border border-line p-1">
        {(
          [
            ["completa", "Redação completa"],
            ["paragrafo", "Treino de parágrafo"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === id ? "bg-sun text-primary-foreground" : "text-ink-soft hover:text-sun-deep"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Treinos corrigidos" value={String(corrected.length)} />
        <Stat label="Média" value={average == null ? "—" : `${average}/${scale}`} />
        <Stat label="Melhor nota" value={best == null ? "—" : `${best}/${scale}`} />
      </div>

      {mode === "paragrafo" && (
        <div className="mt-6 rounded-xl border border-line bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <ListChecks className="size-4 text-sun-deep" /> Qual parágrafo treinar
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PART_DRILLS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPart(p.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  part === p.id
                    ? "border-sun bg-sun/10 text-sun-deep"
                    : "border-line text-ink-soft hover:border-sun"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm">{activeDrill.goal}</p>
          <ol className="mt-3 space-y-1.5 text-sm text-ink-soft">
            {activeDrill.steps.map((s, i) => (
              <li key={s} className="flex gap-2">
                <span className="font-mono text-xs text-sun-deep">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-md bg-sun/5 p-3 text-sm text-ink-soft">
            <span className="font-semibold text-sun-deep">Na {activeBoard.label}: </span>
            {activeDrill.byBoard[activeBoard.id]}
          </p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-line bg-card p-6">
        <h2 className="font-display text-lg font-semibold">
          {mode === "paragrafo" ? `Nova proposta para treinar a ${activeDrill.label.toLowerCase()}` : "Nova proposta"}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Deixe em branco para receber um tema surpresa, ou escreva o assunto que quer treinar.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex.: trabalho por aplicativos, memória e esquecimento…"
            className="min-w-0 flex-1 rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-sun"
          />
          <button
            onClick={() => void createTheme()}
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Gerar proposta
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {STARTER_THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-sun"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">
          Temas atuais · {activeBoard.label}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Propostas reais e simulados de 2025–2026 aplicados pelas bancas e nos maiores cursinhos.
          Clique em um deles para receber a coletânea completa e escrever.
        </p>
        <ul className="mt-4 space-y-2">
          {REAL_THEMES[board].map((t) => {
            const done = essays.some(
              (e) => e.theme_title.trim().toLowerCase() === t.title.toLowerCase(),
            );
            return (
              <li key={t.title}>
                <button
                  onClick={() => void createTheme(t.title)}
                  disabled={creating}
                  className="flex w-full items-start gap-3 rounded-md border border-line px-3 py-2 text-left transition-colors hover:border-sun disabled:opacity-50"
                >
                  <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                    {t.year}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">{t.title}</span>
                  <span className="mt-0.5 shrink-0 text-[11px] font-medium text-ink-soft">
                    {done ? "já treinado" : "novo"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold">Seus treinos</h2>
        {isLoading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </p>
        ) : essays.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            Nada ainda. Gere a primeira proposta aqui em cima.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {essays.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-xl border border-line bg-card p-4">
                <button onClick={() => setOpenId(e.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{e.theme_title}</p>
                  <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                    {e.board} ·{" "}
                    {(e.mode ?? "completa") === "paragrafo" ? getPart(e.part ?? "").label : "completa"} ·{" "}
                    {new Date(e.created_at).toLocaleDateString("pt-BR")} ·{" "}
                    {e.status === "corrigida" ? "corrigida" : "rascunho"}
                  </p>
                </button>
                {e.score != null && (
                  <span className="shrink-0 font-display text-xl font-bold text-sun-deep">
                    {Number(e.score)}
                    <span className="text-xs font-normal text-ink-soft">/{e.max_score ?? 50}</span>
                  </span>
                )}
                <button
                  onClick={() => void remove(e.id)}
                  title="Apagar"
                  className="shrink-0 rounded-md p-2 text-ink-soft transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <ListChecks className="size-4 text-sun-deep" /> Grade oficial da {activeBoard.label}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Nota máxima {activeBoard.maxScore} · {activeBoard.lines}
        </p>
        <div className="mt-4 space-y-2">
          {activeBoard.criteria.map((c) => (
            <details key={c.id} className="rounded-lg border border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                {c.label} <span className="font-mono text-xs text-ink-soft">até {c.max}</span>
              </summary>
              <p className="mt-2 text-sm text-ink-soft">{c.hint}</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {c.levels.map((l) => (
                  <li key={l.label} className="flex gap-2">
                    <span className="shrink-0 font-mono text-xs text-sun-deep">{l.label}</span>
                    <span className="text-ink-soft">{l.desc}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-destructive">
              Zera a redação
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {activeBoard.zeroRules.map((z) => (
                <li key={z}>• {z}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
              Travas da grade
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {activeBoard.caps.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-line bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <BookOpen className="size-4 text-sun-deep" /> O que separa uma nota alta
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {HIGH_SCORE_LESSONS.map((l) => (
            <li key={l} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-sun-deep" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
        <a
          href={cartilha.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-sun-deep hover:underline"
        >
          abrir a cartilha de redações nota 44–48
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function EssayWorkspace({
  essay,
  onBack,
  onGrade,
}: {
  essay: EssayRow;
  onBack: () => void;
  onGrade: (minutes: number) => Promise<void>;
}) {
  const [text, setText] = useState(essay.text ?? "");
  const [saving, setSaving] = useState(false);
  const [grading, setGrading] = useState(false);
  const [seconds, setSeconds] = useState(essay.minutes * 60);
  const [running, setRunning] = useState(essay.status !== "corrigida");
  const startRef = useRef(essay.minutes * 60);

  const board = getBoard(essay.board);
  const isDrill = (essay.mode ?? "completa") === "paragrafo";
  const drill = isDrill ? getPart(essay.part ?? "introducao") : null;
  const target = isDrill ? drill!.words : board.words;
  const minWords = isDrill ? 35 : 120;

  const criteria = useMemo(() => asCriteria(essay.criteria), [essay.criteria]);
  const strengths = useMemo(() => asList(essay.strengths), [essay.strengths]);
  const improvements = useMemo(() => asList(essay.improvements), [essay.improvements]);
  const words = countWords(text);
  const isCorrected = essay.status === "corrigida";

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Salva o rascunho automaticamente enquanto o aluno escreve.
  useEffect(() => {
    if (isCorrected) return;
    const t = setTimeout(() => {
      if (text === essay.text) return;
      setSaving(true);
      void supabase
        .from("essays")
        .update({ text, minutes: Math.round(seconds / 60) })
        .eq("id", essay.id)
        .then(() => setSaving(false));
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  async function submit() {
    if (words < minWords) {
      toast.error(
        isDrill ? "O parágrafo ainda está curto para corrigir." : "O texto ainda está curto para corrigir.",
      );
      return;
    }
    setGrading(true);
    setRunning(false);
    try {
      await supabase.from("essays").update({ text }).eq("id", essay.id);
      await onGrade(Math.max(1, Math.round((seconds - startRef.current) / 60) || 1));
      toast.success("Correção pronta.");
    } catch (err) {
      toast.error(errorMessage(err, "Não consegui corrigir agora. Tente de novo."));
      setRunning(true);
    } finally {
      setGrading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft hover:text-sun-deep"
      >
        <ArrowLeft className="size-3.5" /> todos os treinos
      </button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">
            {board.label} · {isDrill ? `treino de ${drill!.label.toLowerCase()}` : "dissertativo-argumentativo"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{essay.theme_title}</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sun/10 px-2.5 py-1 font-mono text-[11px] text-sun-deep">
          <Clock className="size-3.5" />
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
              Proposta e coletânea
            </p>
            <RichText className="mt-3 space-y-3 whitespace-pre-wrap text-sm leading-relaxed">
              {essay.theme_prompt}
            </RichText>
          </div>

          {drill && (
            <div className="rounded-xl border border-sun/40 bg-sun/5 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sun-deep">
                Técnica da {drill.label.toLowerCase()}
              </p>
              <ol className="mt-3 space-y-1.5 text-sm">
                {drill.steps.map((s, i) => (
                  <li key={s} className="flex gap-2">
                    <span className="font-mono text-xs text-sun-deep">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-ink-soft">{drill.byBoard[board.id]}</p>
            </div>
          )}
        </div>

        <div>
          <div className="rounded-xl border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                {isDrill ? `Seu parágrafo de ${drill!.label.toLowerCase()}` : "Seu texto"}
              </p>
              <p className="font-mono text-[10px] text-ink-soft">
                {words} palavras · alvo {target.min}–{target.max}
                {saving ? " · salvando…" : ""}
              </p>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={isCorrected}
              rows={isDrill ? 9 : 20}
              placeholder={isDrill ? "Escreva aqui só este parágrafo…" : "Escreva aqui a sua redação…"}
              className="mt-3 w-full rounded-md border border-line bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-sun"
            />
            {!isCorrected && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void submit()}
                  disabled={grading}
                  className="inline-flex items-center gap-2 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {grading ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}
                  Entregar para correção
                </button>
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="rounded-md border border-line px-3 py-2 text-xs text-ink-soft transition-colors hover:border-sun"
                >
                  {running ? "pausar tempo" : "retomar tempo"}
                </button>
              </div>
            )}
          </div>

          {isCorrected && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-line bg-card p-5 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                  Nota da correção
                </p>
                <p className="mt-1 font-display text-5xl font-bold text-sun-deep">
                  {Number(essay.score)}
                  <span className="text-lg font-normal text-ink-soft">/{essay.max_score ?? board.maxScore}</span>
                </p>
              </div>

              {criteria.map((c) => (
                <div key={c.id} className="rounded-xl border border-line bg-card p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">{c.label}</p>
                    <p className="font-mono text-sm text-sun-deep">
                      {c.score}/{c.max}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-line">
                    <div
                      className="h-1.5 rounded-full bg-sun"
                      style={{ width: `${Math.round((c.score / c.max) * 100)}%` }}
                    />
                  </div>
                  {c.comment && <p className="mt-2 text-sm text-ink-soft">{c.comment}</p>}
                </div>
              ))}

              {essay.feedback && (
                <div className="rounded-xl border border-line bg-card p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                    Comentário geral
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{essay.feedback}</p>
                </div>
              )}

              {strengths.length > 0 && <ListCard title="O que já está bom" items={strengths} tone="good" />}
              {improvements.length > 0 && (
                <ListCard title="O que treinar no próximo" items={improvements} tone="warn" />
              )}

              {essay.rewritten && (
                <div className="rounded-xl border border-sun/40 bg-sun/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sun-deep">
                    {isDrill ? "Seu parágrafo reescrito em nível nota máxima" : "Sua introdução reescrita em nível nota máxima"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{essay.rewritten}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ListCard({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className={tone === "good" ? "text-sun-deep" : "text-destructive"}>•</span>
            <span className={tone === "good" ? "" : "text-ink-soft"}>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
