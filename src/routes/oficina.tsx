import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  Lightbulb,
  Loader2,
  PenLine,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/error-message";
import { RichText } from "@/lib/text";
import { generateEssayTheme, gradeEssay, type EssayGrade } from "@/lib/redacao.functions";
import { coachPlan, coachStep, type CoachFeedback, type CoachPlan } from "@/lib/redacao-coach.functions";
import { coachScript, type CoachStep } from "@/data/redacao-coach";
import { BOARDS, STARTER_THEMES, getBoard, type BoardId } from "@/data/redacao-guide";
import { REAL_THEMES } from "@/data/redacao-corpus";

export const Route = createFileRoute("/oficina")({
  head: () => ({
    meta: [
      { title: "Oficina de redação guiada — escreva período a período | Fichário" },
      {
        name: "description",
        content:
          "Treino de redação assistido do começo ao fim: escolha a banca, planeje a tese e escreva um período por vez com devolutiva imediata do professor de IA.",
      },
      { property: "og:title", content: "Oficina de redação guiada — período a período" },
      {
        property: "og:description",
        content: "Planeje, escreva um período por vez e receba correção imediata no padrão da sua banca.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <OficinaPage />
    </AppShell>
  ),
});

type Written = { stepId: string; text: string };

const countWords = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

function assemble(script: CoachStep[], written: Written[]) {
  const byId = new Map(written.map((w) => [w.stepId, w.text]));
  const blocks: string[] = [];
  let currentBlock = "";
  let acc: string[] = [];
  for (const step of script) {
    const text = byId.get(step.id);
    if (step.block !== currentBlock) {
      if (acc.length) blocks.push(acc.join(" "));
      acc = [];
      currentBlock = step.block;
    }
    if (text) acc.push(text.trim());
  }
  if (acc.length) blocks.push(acc.join(" "));
  return blocks.join("\n\n");
}

function OficinaPage() {
  const generate = useServerFn(generateEssayTheme);
  const [board, setBoard] = useState<BoardId>("FUVEST");
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const [session, setSession] = useState<{ essayId: string; title: string; prompt: string; board: BoardId } | null>(
    null,
  );

  async function start(exactTitle?: string) {
    setCreating(true);
    try {
      const theme = await generate({
        data: { board, mode: "completa", exactTitle, topic: exactTitle ? undefined : topic.trim() || undefined },
      });
      setSession({ essayId: theme.essayId, title: theme.title, prompt: theme.prompt, board });
    } catch (err) {
      toast.error(errorMessage(err, "Não consegui montar a proposta agora."));
    } finally {
      setCreating(false);
    }
  }

  if (session) return <Workshop session={session} onExit={() => setSession(null)} />;

  const activeBoard = getBoard(board);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">treino guiado</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Oficina de redação</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Aqui você não escreve sozinho. A gente planeja a tese junto e depois você manda um período por
        vez: cada período recebe devolutiva imediata, versão melhorada e a dica do que vem a seguir,
        sempre no padrão da banca que você escolher.
      </p>
      <Link
        to="/redacao"
        className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft hover:text-sun-deep"
      >
        prefiro escrever a redação inteira →
      </Link>

      <div className="mt-6 flex flex-wrap gap-2">
        {BOARDS.map((b) => (
          <button
            key={b.id}
            onClick={() => setBoard(b.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              board === b.id ? "border-sun bg-sun/10 text-sun-deep" : "border-line text-ink-soft hover:border-sun"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {activeBoard.style} {activeBoard.lines}.
      </p>

      <div className="mt-6 rounded-xl border border-line bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Sobre o que você quer treinar hoje?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Deixe em branco para um tema surpresa dentro do debate atual, ou escreva o assunto.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex.: inteligência artificial e trabalho, solidão, cigarro eletrônico…"
            className="min-w-0 flex-1 rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-sun"
          />
          <button
            onClick={() => void start()}
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Começar treino guiado
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

      <div className="mt-6 rounded-xl border border-line bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Ou treine com um tema real · {activeBoard.label}</h2>
        <ul className="mt-3 space-y-2">
          {REAL_THEMES[board].map((t) => (
            <li key={t.title}>
              <button
                onClick={() => void start(t.title)}
                disabled={creating}
                className="w-full rounded-lg border border-line px-3 py-2 text-left text-sm transition-colors hover:border-sun disabled:opacity-50"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-sun-deep">{t.year}</span>
                <span className="mt-0.5 block">{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Workshop({
  session,
  onExit,
}: {
  session: { essayId: string; title: string; prompt: string; board: BoardId };
  onExit: () => void;
}) {
  const plan = useServerFn(coachPlan);
  const step = useServerFn(coachStep);
  const grade = useServerFn(gradeEssay);

  const script = useMemo(() => coachScript(session.board), [session.board]);
  const board = getBoard(session.board);

  const [written, setWritten] = useState<Written[]>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<CoachFeedback | null>(null);
  const [checking, setChecking] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planData, setPlanData] = useState<CoachPlan | null>(null);
  const [finalGrade, setFinalGrade] = useState<EssayGrade | null>(null);
  const [grading, setGrading] = useState(false);

  const index = written.length;
  const current = script[index] ?? null;
  const text = useMemo(() => assemble(script, written), [script, written]);
  const done = index >= script.length;

  async function save(next: Written[]) {
    setWritten(next);
    await supabase.from("essays").update({ text: assemble(script, next) }).eq("id", session.essayId);
  }

  async function check() {
    if (!current) return;
    if (countWords(draft) < 5) {
      toast.error("Escreva o período completo antes de enviar.");
      return;
    }
    setChecking(true);
    try {
      setFeedback(await step({ data: { essayId: session.essayId, stepId: current.id, sentence: draft, written: text } }));
    } catch (err) {
      toast.error(errorMessage(err, "Não consegui analisar agora. Tente de novo."));
    } finally {
      setChecking(false);
    }
  }

  async function accept(value: string) {
    if (!current) return;
    await save([...written, { stepId: current.id, text: value.trim() }]);
    setDraft("");
    setFeedback(null);
  }

  async function buildPlan() {
    setPlanning(true);
    try {
      setPlanData(await plan({ data: { essayId: session.essayId } }));
    } catch (err) {
      toast.error(errorMessage(err, "Não consegui montar o plano agora."));
    } finally {
      setPlanning(false);
    }
  }

  async function finish() {
    setGrading(true);
    try {
      await supabase.from("essays").update({ text }).eq("id", session.essayId);
      setFinalGrade(await grade({ data: { essayId: session.essayId, minutes: 0 } }));
    } catch (err) {
      toast.error(errorMessage(err, "Não consegui corrigir agora."));
    } finally {
      setGrading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft hover:text-sun-deep"
      >
        <ArrowLeft className="size-3.5" /> sair da oficina
      </button>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">
        {board.label} · treino guiado
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{session.title}</h1>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {script.map((s, i) => (
          <span
            key={s.id}
            title={s.label}
            className={`h-1.5 w-8 rounded-full ${
              i < index ? "bg-sun" : i === index ? "bg-sun/50" : "bg-line"
            }`}
          />
        ))}
        <span className="ml-2 font-mono text-[10px] text-ink-soft">
          {index}/{script.length} períodos · {countWords(text)} palavras
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">Proposta e coletânea</p>
            <RichText className="mt-3 space-y-3 whitespace-pre-wrap text-sm leading-relaxed">
              {session.prompt}
            </RichText>
          </div>

          <div className="rounded-xl border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-display text-base font-semibold">
                <Lightbulb className="size-4 text-sun-deep" /> Planejamento
              </p>
              <button
                onClick={() => void buildPlan()}
                disabled={planning}
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-sun disabled:opacity-50"
              >
                {planning ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                {planData ? "refazer" : "planejar comigo"}
              </button>
            </div>
            {!planData && (
              <p className="mt-2 text-sm text-ink-soft">
                Antes da primeira palavra: veja o que a frase temática exige, caminhos de tese, pares de
                argumentos e repertórios aplicáveis.
              </p>
            )}
            {planData && (
              <div className="mt-3 space-y-4 text-sm">
                {planData.leitura && <p className="text-ink-soft">{planData.leitura}</p>}
                <Section title="Teses possíveis">
                  {planData.teses.map((t) => (
                    <li key={t.texto}>
                      <span className="font-medium">{t.texto}</span>
                      <span className="block text-ink-soft">{t.comentario}</span>
                    </li>
                  ))}
                </Section>
                <Section title="Pares de argumentos (D1 → D2)">
                  {planData.eixos.map((e) => (
                    <li key={e.d1}>
                      <span className="font-medium">D1:</span> {e.d1}
                      <span className="block">
                        <span className="font-medium">D2:</span> {e.d2}
                      </span>
                    </li>
                  ))}
                </Section>
                <Section title="Repertórios">
                  {planData.repertorios.map((r) => (
                    <li key={r.fonte}>
                      <span className="font-medium">{r.fonte}</span>
                      <span className="block text-ink-soft">{r.uso}</span>
                    </li>
                  ))}
                </Section>
                <Section title="Armadilhas deste tema">
                  {planData.armadilhas.map((a) => (
                    <li key={a} className="text-ink-soft">
                      {a}
                    </li>
                  ))}
                </Section>
              </div>
            )}
          </div>

          {text && (
            <div className="rounded-xl border border-line bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">Seu texto até aqui</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {current && (
            <div className="rounded-xl border border-sun/40 bg-sun/5 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sun-deep">
                {current.blockLabel}
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold">{current.label}</h2>
              <p className="mt-1 text-sm">{current.goal}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {current.checklist.map((c) => (
                  <li key={c} className="flex gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-sun-deep" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-soft">{current.hint}</p>
            </div>
          )}

          {current && (
            <div className="rounded-xl border border-line bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                  Escreva só este período
                </p>
                <p className="font-mono text-[10px] text-ink-soft">
                  {countWords(draft)} palavras · alvo {current.words.min}–{current.words.max}
                </p>
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder="Um período só, terminando em ponto final…"
                className="mt-3 w-full rounded-md border border-line bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-sun"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void check()}
                  disabled={checking}
                  className="inline-flex items-center gap-2 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {checking ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}
                  Enviar período
                </button>
                {feedback && (
                  <button
                    onClick={() => void accept(draft)}
                    className="rounded-md border border-line px-3 py-2 text-xs font-semibold transition-colors hover:border-sun"
                  >
                    seguir com o meu
                  </button>
                )}
              </div>
            </div>
          )}

          {feedback && current && (
            <div className="rounded-xl border border-line bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                  Devolutiva do período
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${
                    feedback.aprovado ? "bg-sun/10 text-sun-deep" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {feedback.nota}/10 · {feedback.aprovado ? "pode seguir" : "vale reescrever"}
                </span>
              </div>
              {feedback.acertos.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {feedback.acertos.map((a) => (
                    <li key={a} className="flex gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-sun-deep" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}
              {feedback.ajustes.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                  {feedback.ajustes.map((a) => (
                    <li key={a}>• {a}</li>
                  ))}
                </ul>
              )}
              {feedback.versaoMelhor && (
                <div className="mt-4 rounded-lg bg-sun/5 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sun-deep">
                    Versão em nível nota máxima
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{feedback.versaoMelhor}</p>
                  {feedback.porqueMelhor && (
                    <p className="mt-2 text-xs text-ink-soft">{feedback.porqueMelhor}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void accept(feedback.versaoMelhor)}
                      className="rounded-md bg-sun px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      usar esta versão
                    </button>
                    <button
                      onClick={() => {
                        setDraft(feedback.versaoMelhor);
                        setFeedback(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-sun"
                    >
                      <RefreshCw className="size-3.5" /> editar a partir dela
                    </button>
                  </div>
                </div>
              )}
              {feedback.dicaProximo && (
                <p className="mt-4 text-sm">
                  <span className="font-semibold text-sun-deep">Próximo passo: </span>
                  {feedback.dicaProximo}
                </p>
              )}
            </div>
          )}

          {done && !finalGrade && (
            <div className="rounded-xl border border-sun/40 bg-sun/5 p-5">
              <h2 className="font-display text-lg font-semibold">Texto completo</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Você fechou os {script.length} períodos. Agora vale a correção nos critérios oficiais da{" "}
                {board.label}.
              </p>
              <button
                onClick={() => void finish()}
                disabled={grading}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {grading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Corrigir a redação inteira
              </button>
            </div>
          )}

          {finalGrade && (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-card p-5 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">Nota final</p>
                <p className="mt-1 font-display text-5xl font-bold text-sun-deep">
                  {finalGrade.score}
                  <span className="text-lg font-normal text-ink-soft">/{finalGrade.maxScore}</span>
                </p>
              </div>
              {finalGrade.criteria.map((c) => (
                <div key={c.id} className="rounded-xl border border-line bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{c.label}</p>
                    <span className="font-mono text-xs text-sun-deep">
                      {c.score}/{c.max}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-soft">{c.comment}</p>
                </div>
              ))}
              {finalGrade.feedback && (
                <div className="rounded-xl border border-line bg-card p-5 text-sm leading-relaxed">
                  {finalGrade.feedback}
                </div>
              )}
              <Link
                to="/redacao"
                className="inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-sun-deep hover:underline"
              >
                ver este treino na lista de redações
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">{title}</p>
      <ul className="mt-2 space-y-2">{children}</ul>
    </div>
  );
}
