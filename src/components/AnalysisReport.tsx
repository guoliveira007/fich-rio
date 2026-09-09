import { AlertTriangle, Check, Quote, X } from "lucide-react";

import { errorKindLabel } from "@/lib/practice";
import { cleanText, RichText } from "@/lib/text";

export type AnalysisStep = { title: string; detail: string; status: string };
export type AnalysisOption = { letter: string; verdict: string; why: string };
export type AnalysisClue = { quote: string; why: string };

function asSteps(value: unknown): AnalysisStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return [
      {
        title: String(row["title"] ?? ""),
        detail: String(row["detail"] ?? ""),
        status: String(row["status"] ?? "ok"),
      },
    ];
  });
}

function asOptions(value: unknown): AnalysisOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const letter = String(row["letter"] ?? "");
    if (!letter) return [];
    return [
      {
        letter,
        verdict: String(row["verdict"] ?? "descartavel"),
        why: String(row["why"] ?? ""),
      },
    ];
  });
}

function asClues(value: unknown): AnalysisClue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const quote = String(row["quote"] ?? "");
    if (!quote) return [];
    return [{ quote, why: String(row["why"] ?? "") }];
  });
}

const VERDICT_LABEL: Record<string, string> = {
  correta: "alternativa certa",
  pegadinha: "pegadinha que te atraiu",
  descartavel: "dava para descartar",
};

/** Passo a passo da resolução com a etapa exata do tropeço + relatório do acerto/erro. */
export function AnalysisReport({
  review,
  userAnswer,
  correctAnswer,
}: {
  review: {
    steps?: unknown;
    misstep_step?: number | null;
    option_analysis?: unknown;
    statement_clues?: unknown;
    error_type?: string | null;
    was_correct?: boolean | null;
    concept?: string | null;
  };
  userAnswer?: string | null;
  correctAnswer?: string | null;
}) {
  const steps = asSteps(review.steps);
  const options = asOptions(review.option_analysis);
  const clues = asClues(review.statement_clues);
  const misstep = review.misstep_step ?? null;
  const wasCorrect = review.was_correct === true;

  if (steps.length === 0 && options.length === 0 && clues.length === 0) return null;

  return (
    <div className="space-y-5">
      {steps.length > 0 && (
        <div>
          <p className="font-display font-semibold">Passo a passo da resolução</p>
          {misstep && (
            <p className="mt-1 text-xs text-destructive">
              Você se confundiu na etapa {misstep}
              {steps[misstep - 1]?.title ? ` — ${steps[misstep - 1]?.title}` : ""}.
            </p>
          )}
          <ol className="mt-3 space-y-2">
            {steps.map((step, index) => {
              const isError = step.status === "erro";
              const isWarn = step.status === "atencao";
              return (
                <li
                  key={index}
                  className={`flex gap-3 rounded-lg border p-3 ${
                    isError
                      ? "border-destructive/50 bg-destructive/5"
                      : isWarn
                        ? "border-sun bg-sun/5"
                        : "border-line bg-paper"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold ${
                      isError
                        ? "bg-destructive text-destructive-foreground"
                        : isWarn
                          ? "bg-sun text-primary-foreground"
                          : "bg-sun/15 text-sun-deep"
                    }`}
                  >
                    {isError ? (
                      <X className="size-3.5" />
                    ) : isWarn ? (
                      <AlertTriangle className="size-3.5" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {index + 1}. {step.title}
                    </span>
                    {step.detail && (
                      <span className="mt-0.5 block text-sm text-ink-soft">
                        <RichText className="space-y-1">{step.detail}</RichText>
                      </span>
                    )}
                    {isError && (
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-destructive">
                        revisar aqui
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="rounded-lg border border-line bg-paper p-4">
        <p className="font-display font-semibold">
          Relatório: por que você {wasCorrect ? "acertou" : "errou"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.15em]">
          <span
            className={`rounded-full px-2.5 py-1 ${
              wasCorrect
                ? "bg-sun/15 text-sun-deep"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {wasCorrect ? "acerto" : "erro"}
            {userAnswer ? ` · marcou ${userAnswer}` : ""}
            {correctAnswer ? ` · gabarito ${correctAnswer}` : ""}
          </span>
          {!wasCorrect && review.error_type && (
            <span className="rounded-full border border-line px-2.5 py-1 text-ink-soft">
              categoria: {errorKindLabel(review.error_type)}
            </span>
          )}
          {review.concept && (
            <span className="rounded-full border border-line px-2.5 py-1 text-ink-soft">
              {review.concept}
            </span>
          )}
        </div>

        {options.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
              Alternativas que pesaram
            </p>
            {options.map((option) => {
              const isCorrect = option.verdict === "correta";
              const isTrap = option.verdict === "pegadinha";
              const marked = userAnswer && option.letter === userAnswer.toUpperCase();
              return (
                <div key={option.letter} className="flex gap-3">
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded font-mono text-[11px] font-bold ${
                      isCorrect
                        ? "bg-sun text-primary-foreground"
                        : isTrap
                          ? "bg-destructive/10 text-destructive"
                          : "border border-line text-ink-soft"
                    }`}
                  >
                    {option.letter}
                  </span>
                  <p className="min-w-0 flex-1 text-sm text-ink-soft">
                    <span className={isCorrect ? "text-sun-deep" : isTrap ? "text-destructive" : ""}>
                      {VERDICT_LABEL[option.verdict] ?? option.verdict}
                      {marked ? " · você marcou esta" : ""}
                    </span>
                    {option.why ? ` — ${option.why}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {clues.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
              Trechos do enunciado que decidiram
            </p>
            {clues.map((clue, index) => (
              <blockquote
                key={index}
                className="border-l-2 border-sun pl-3 text-sm"
              >
                <span className="flex items-start gap-1.5 text-ink">
                  <Quote className="mt-0.5 size-3 shrink-0 text-sun-deep" />
                  <span>{clue.quote}</span>
                </span>
                {clue.why && <span className="mt-1 block text-xs text-ink-soft">{clue.why}</span>}
              </blockquote>
            ))}
          </div>
        )}

        {wasCorrect && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-sun-deep">
            <Check className="size-3.5" /> Acerto confirmado pelo raciocínio que você descreveu.
          </p>
        )}
      </div>
    </div>
  );
}
