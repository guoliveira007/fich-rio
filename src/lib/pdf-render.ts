/**
 * Renderização de páginas de PDF no navegador (pdf.js).
 *
 * Serve para dois usos:
 * - mostrar a página da prova como imagem nítida (funciona no celular, onde o
 *   visualizador de PDF dentro da página costuma falhar);
 * - gerar uma imagem em alta resolução da página para a IA ler gráficos,
 *   tabelas, mapas e figuras com os valores exatos.
 *
 * Só pode ser usado no navegador (usa canvas), nunca no servidor.
 */

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
    promise: Promise<void>;
  };
};

let libPromise: Promise<{ getDocument: (o: unknown) => { promise: Promise<PdfDoc> } }> | null = null;

async function loadPdfjs() {
  if (!libPromise) {
    libPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs as unknown as { getDocument: (o: unknown) => { promise: Promise<PdfDoc> } };
    })();
  }
  return libPromise;
}

const docCache = new Map<string, Promise<PdfDoc>>();

async function openDocument(source: ArrayBuffer | Uint8Array | Blob, cacheKey?: string) {
  if (cacheKey && docCache.has(cacheKey)) return docCache.get(cacheKey)!;
  const promise = (async () => {
    const pdfjs = await loadPdfjs();
    const data =
      source instanceof Blob
        ? new Uint8Array(await source.arrayBuffer())
        : source instanceof Uint8Array
          ? source
          : new Uint8Array(source);
    return pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  })();
  if (cacheKey) docCache.set(cacheKey, promise);
  return promise;
}

export type RenderedPage = {
  /** imagem da página em data URL (JPEG) */
  dataUrl: string;
  width: number;
  height: number;
  pageCount: number;
};

/**
 * Desenha uma página do PDF em imagem. `maxWidth` controla a nitidez:
 * ~1000px basta para exibir na tela, 1700-2200px é o ideal para a IA ler
 * números de gráficos e células de tabela.
 */
export async function renderPdfPage(
  source: ArrayBuffer | Uint8Array | Blob,
  pageNumber: number,
  opts: { maxWidth?: number; quality?: number; cacheKey?: string } = {},
): Promise<RenderedPage> {
  const maxWidth = Math.max(600, Math.min(opts.maxWidth ?? 1400, 2600));
  const doc = await openDocument(source, opts.cacheKey);
  const target = Math.min(Math.max(1, pageNumber || 1), doc.numPages);
  const page = await doc.getPage(target);

  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(4, Math.max(1, maxWidth / base.width));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível desenhar a página do PDF neste navegador.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  return {
    dataUrl: canvas.toDataURL("image/jpeg", opts.quality ?? 0.9),
    width: canvas.width,
    height: canvas.height,
    pageCount: doc.numPages,
  };
}

/** Quantas páginas o PDF tem, sem desenhar nada. */
export async function pdfPageCount(
  source: ArrayBuffer | Uint8Array | Blob,
  cacheKey?: string,
): Promise<number> {
  const doc = await openDocument(source, cacheKey);
  return doc.numPages;
}
