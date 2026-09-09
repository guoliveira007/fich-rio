import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, Promise<ArrayBuffer>>();

/** Baixa o PDF da prova guardado na nuvem (uma vez por arquivo, no navegador). */
export function loadExamPdf(filePath: string): Promise<ArrayBuffer> {
  const cached = cache.get(filePath);
  if (cached) return cached;
  const promise = (async () => {
    const { data, error } = await supabase.storage.from("exam-files").download(filePath);
    if (error || !data) throw new Error("Não foi possível abrir o arquivo da prova.");
    return data.arrayBuffer();
  })();
  cache.set(filePath, promise);
  return promise;
}
