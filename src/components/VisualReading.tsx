import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";

import { readQuestionVisual } from "@/lib/exams.functions";
import { loadExamPdf } from "@/lib/exam-pdf-client";
import { renderPdfPage } from "@/lib/pdf-render";
import { RichText } from "@/lib/text";

type Props = {
  questionId: string;
  visualSummary?: string | null;
  /** arquivo da prova na nuvem, para desenhar a página em alta resolução */
  filePath?: string | null;
  page?: number | null;
};

/**
 * Mostra a leitura em texto do gráfico/tabela/figura da questão, com os valores
 * exatos. A leitura é feita sobre a imagem da página em alta resolução, o que
 * permite à IA ler eixos, pontos e células com precisão.
 */
export function VisualReading({ questionId, visualSummary, filePath, page }: Props) {
  const read = useServerFn(readQuestionVisual);
  const [summary, setSummary] = useState<string | null>(visualSummary ?? null);
  const [stage, setStage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (force: boolean) => {
      let pageImage: string | null = null;
      if (filePath) {
        try {
          setStage("Desenhando a página em alta resolução…");
          const bytes = await loadExamPdf(filePath);
          const rendered = await renderPdfPage(bytes, page ?? 1, {
            maxWidth: 2000,
            quality: 0.92,
            cacheKey: filePath,
          });
          pageImage = rendered.dataUrl;
        } catch {
          pageImage = null;
        }
      }
      setStage("Lendo a figura e conferindo os valores…");
      return read({ data: { questionId, pageImage, force } });
    },
    onSuccess: (res) => {
      setSummary(res.visual_summary);
      setStage(null);
    },
    onError: () => setStage(null),
  });

  if (summary) {
    return (
      <div className="rounded-lg border border-line bg-paper p-3">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-sun-deep">
          <BarChart3 className="size-3.5" />
          Leitura da figura
        </p>
        <RichText className="mt-2 space-y-2 text-sm leading-relaxed">{summary}</RichText>
        <button
          type="button"
          onClick={() => mutation.mutate(true)}
          disabled={mutation.isPending}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-sun-deep disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Ler a figura de novo com mais detalhe
        </button>
        {mutation.isPending && stage && <p className="mt-1 text-xs text-ink-soft">{stage}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => mutation.mutate(false)}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm font-semibold transition-colors hover:border-sun disabled:opacity-50"
      >
        {mutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BarChart3 className="size-4" />
        )}
        Ler o gráfico/figura em texto
      </button>
      {mutation.isPending && stage && <p className="text-xs text-ink-soft">{stage}</p>}
      {mutation.isError && (
        <p className="text-xs text-destructive">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Não consegui ler a figura desta questão."}
        </p>
      )}
    </div>
  );
}
