import { useEffect, useState } from "react";
import { ImageIcon, Loader2, Maximize2, ZoomIn, ZoomOut } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { loadExamPdf } from "@/lib/exam-pdf-client";
import { renderPdfPage } from "@/lib/pdf-render";
import { RichText } from "@/lib/text";

/**
 * Mostra a página do PDF da prova onde está a questão, desenhada como imagem
 * nítida (funciona no celular) e com zoom para ler gráficos e tabelas.
 */
export function ExamPagePreview({
  filePath,
  page,
  label,
  file,
  defaultOpen = false,
  fallbackText,
}: {
  filePath?: string | null | undefined;
  page: number | null | undefined;
  label?: string | undefined;
  /** arquivo local, quando a prova ainda não foi salva */
  file?: File | null | undefined;
  /** abre já mostrando a imagem (questões com figura) */
  defaultOpen?: boolean;
  /** texto mostrado quando a imagem original não está disponível */
  fallbackText?: string | null | undefined;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [zoom, setZoom] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const source = filePath ?? (file ? `local:${file.name}:${file.size}` : null);

  useEffect(() => {
    if (!open || img || !source) return;
    let active = true;
    setError(null);
    (async () => {
      try {
        const bytes = file ? await file.arrayBuffer() : await loadExamPdf(filePath!);
        const rendered = await renderPdfPage(bytes, page ?? 1, {
          maxWidth: 1500,
          cacheKey: source,
        });
        if (active) setImg(rendered.dataUrl);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Não foi possível abrir a página da prova.");
      }
    })();
    return () => {
      active = false;
    };
  }, [open, img, source, filePath, file, page]);

  if (!source || !page) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-paper p-3">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
          <ImageIcon className="size-3.5" />
          Imagem da questão indisponível
        </p>
        <p className="mt-1.5 text-xs text-ink-soft">
          {!source
            ? "O arquivo original desta prova não está guardado, então não dá para mostrar a figura."
            : "Não sei em que página desta prova a questão está, então não consigo mostrar a figura."}
        </p>
        {fallbackText && (
          <RichText className="mt-2 space-y-2 text-sm leading-relaxed">{fallbackText}</RichText>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-paper">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft transition-colors hover:text-sun-deep"
      >
        <ImageIcon className="size-3.5" />
        {label ?? "Figura da prova"}
        {page ? ` · página ${page}` : ""}
        <span className="ml-auto">{open ? "ocultar" : "ver"}</span>
      </button>

      {open && (
        <div className="border-t border-line p-3">
          {error ? (
            <div>
              <p className="text-xs text-ink-soft">{error}</p>
              {fallbackText && (
                <RichText className="mt-2 space-y-2 text-sm leading-relaxed">{fallbackText}</RichText>
              )}
            </div>
          ) : img ? (
            <>
              <button
                type="button"
                onClick={() => setZoom(true)}
                className="block w-full overflow-hidden rounded-md border border-line bg-card"
              >
                <img
                  src={img}
                  alt={`Página ${page ?? 1} da prova`}
                  className="w-full"
                  loading="lazy"
                />
              </button>
              <button
                type="button"
                onClick={() => setZoom(true)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-sun-deep hover:underline"
              >
                <Maximize2 className="size-3.5" /> Ampliar a página
              </button>
            </>
          ) : (
            <p className="inline-flex items-center gap-2 text-xs text-ink-soft">
              <Loader2 className="size-3.5 animate-spin" /> Desenhando a página…
            </p>
          )}
        </div>
      )}

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-[95vw] p-2 sm:max-w-4xl">
          <DialogTitle className="px-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
            Página {page ?? 1} da prova
          </DialogTitle>
          <div className="max-h-[80vh] overflow-auto rounded-md border border-line bg-card">
            {img && (
              <img src={img} alt={`Página ${page ?? 1} ampliada`} className="w-[180%] sm:w-full" />
            )}
          </div>
          <p className="flex items-center gap-2 px-2 pb-1 text-xs text-ink-soft">
            <ZoomIn className="size-3.5" /> Use o gesto de pinça ou o scroll para aproximar
            <ZoomOut className="size-3.5" />
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
