import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Loader2 } from "lucide-react";

import { readVisualFromImage } from "@/lib/exams.functions";
import { loadExamPdf } from "@/lib/exam-pdf-client";
import { renderPdfPage } from "@/lib/pdf-render";

type Props = {
  filePath: string | null;
  number: number;
  page?: number | null;
  statement?: string | null;
  options?: Record<string, string> | null;
  summary?: string | null;
  onRead: (summary: string) => void;
};

/**
 * Lê o gráfico/tabela/figura da questão durante a importação da prova, usando a
 * imagem da página em alta resolução desenhada no navegador.
 */
export function WizardVisualReading({
  filePath,
  number,
  page,
  statement,
  options,
  summary,
  onRead,
}: Props) {
  const read = useServerFn(readVisualFromImage);
  const [stage, setStage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!filePath) throw new Error("Envie o PDF da prova para ler a figura.");
      setStage("Desenhando a página em alta resolução…");
      const bytes = await loadExamPdf(filePath);
      const rendered = await renderPdfPage(bytes, page ?? 1, {
        maxWidth: 2000,
        quality: 0.92,
        cacheKey: filePath,
      });
      setStage("Lendo a figura e conferindo os valores…");
      return read({
        data: {
          pageImage: rendered.dataUrl,
          number,
          statement: statement ?? null,
          options: options ?? null,
          page: page ?? null,
        },
      });
    },
    onSuccess: (res) => {
      setStage(null);
      onRead(res.visual_summary);
    },
    onError: () => setStage(null),
  });

  if (summary || !filePath) return null;

  return (
    <div className="mt-3 space-y-1">
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-sun disabled:opacity-50"
      >
        {mutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <BarChart3 className="size-3.5" />
        )}
        Ler o gráfico/figura em texto
      </button>
      {mutation.isPending && stage && <p className="text-xs text-ink-soft">{stage}</p>}
      {mutation.isError && (
        <p className="text-xs text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : "Não consegui ler a figura."}
        </p>
      )}
    </div>
  );
}
