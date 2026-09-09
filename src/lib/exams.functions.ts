import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { AiError, aiJson, aiText, toDataUrl, type ContentPart } from "./exam-ai.server";

export type ExtractedQuestion = {
  number: number;
  subject: string | null;
  topic: string | null;
  statement: string | null;
  options: Record<string, string> | null;
  correct_answer: string | null;
  page_number?: number | null;
  has_visual?: boolean | null;
  visual_summary?: string | null;

};


type StorageLike = {
  storage: {
    from: (b: string) => { download: (p: string) => Promise<{ data: Blob | null; error: unknown }> };
  };
};

async function fileBytes(supabase: StorageLike, filePath: string) {
  const { data, error } = await supabase.storage.from("exam-files").download(filePath);
  if (error || !data) throw new Error("Não foi possível ler o arquivo enviado.");
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (bytes.length === 0) throw new Error("O arquivo enviado está vazio.");
  const mime = data.type && data.type !== "" ? data.type : "application/pdf";
  const name = filePath.split("/").pop() ?? "arquivo.pdf";
  return { bytes, mime, name };
}

async function fileParts(supabase: StorageLike, filePath: string): Promise<ContentPart> {
  const { bytes, mime, name } = await fileBytes(supabase, filePath);
  return { type: "file", file: { filename: name, file_data: toDataUrl(bytes, mime) } };
}

/** Quantas páginas o PDF tem por bloco de leitura (menor = resposta menor e mais segura). */
const PAGES_PER_CHUNK = 4;
/** Páginas repetidas no início do trecho, para não cortar questões entre páginas. */
const OVERLAP_PAGES = 1;

type PageSlice = { part: ContentPart; totalChunks: number; firstPage: number; lastPage: number };

/** Quantas páginas o PDF tem (null quando não é um PDF legível). */
async function pdfPageCount(bytes: Uint8Array): Promise<number | null> {
  const { PDFDocument } = await import("pdf-lib");
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return null;
  }
}

/**
 * Recorta um intervalo de páginas do PDF. Devolve null quando o arquivo não é PDF
 * (nesse caso lemos o arquivo inteiro de uma vez).
 */
async function pdfSlice(
  bytes: Uint8Array,
  name: string,
  opts: { chunkIndex: number; chunkSize: number; pageFrom?: number; pageTo?: number },
): Promise<PageSlice | null> {
  const { PDFDocument } = await import("pdf-lib");
  let doc: import("pdf-lib").PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    return null;
  }
  const pageCount = doc.getPageCount();
  const size = Math.max(1, Math.min(opts.chunkSize, 12));
  const totalChunks = Math.max(1, Math.ceil(pageCount / size));

  let first: number;
  let last: number;
  if (opts.pageFrom && opts.pageTo) {
    first = Math.min(Math.max(1, opts.pageFrom), pageCount) - 1;
    last = Math.min(Math.max(opts.pageTo, opts.pageFrom), pageCount);
  } else {
    const index = Math.min(Math.max(0, opts.chunkIndex), totalChunks - 1);
    const start = index * size;
    first = Math.max(0, start - (index > 0 ? OVERLAP_PAGES : 0));
    last = Math.min(pageCount, start + size);
  }

  const out = await PDFDocument.create();
  const pages = await out.copyPages(
    doc,
    Array.from({ length: Math.max(1, last - first) }, (_, i) => first + i),
  );
  for (const page of pages) out.addPage(page);
  const chunkBytes = await out.save();

  return {
    part: {
      type: "file",
      file: {
        filename: name,
        file_data: toDataUrl(new Uint8Array(chunkBytes), "application/pdf"),
      },
    },
    totalChunks,
    firstPage: first + 1,
    lastPage: last,
  };
}

const EXTRACT_PROMPT = `Você é um assistente que lê provas de vestibulares e simulados em PDF.
Extraia TODAS as questões objetivas encontradas neste trecho, em ordem, sem pular nenhuma.
Para cada questão devolva:
- number: número da questão (inteiro, exatamente como aparece na prova)
- subject: a matéria (ex.: "Matemática", "Português", "História", "Biologia")
- topic: o assunto específico (ex.: "Função quadrática", "Concordância verbal")
- statement: o enunciado COMPLETO, incluindo textos de apoio curtos (máximo 1200 caracteres)
- options: objeto com as alternativas, ex.: {"A":"...","B":"..."} (use null se não conseguir ler)
- correct_answer: a letra correta se e somente se o PDF trouxer o gabarito; caso contrário null
- page_number: o número da página do PDF em que a questão aparece (inteiro, começando em 1 no trecho recebido)
- has_visual: true se a questão depende de imagem, gráfico, mapa, figura, tabela ou fórmula complexa que você não conseguiu transcrever fielmente; false caso o enunciado em texto seja suficiente
- visual_summary: quando has_visual for true, descreva a figura com os VALORES EXATOS, em texto puro, máximo 600 caracteres. Quando has_visual for false, use null.
Se uma questão estiver cortada no fim do trecho, ignore-a: ela será lida no trecho seguinte.
Seja conciso para caber na resposta. Formato: {"questions":[...]}`;

const LETTER = /^[A-Ea-e]$/;

/** Valida e normaliza uma questão vinda da IA. Devolve null quando é inaproveitável. */
function normalizeQuestion(
  raw: ExtractedQuestion,
  pageOffset: number,
  pageLimit: number,
): ExtractedQuestion | null {
  const number = Number(raw?.number);
  if (!Number.isInteger(number) || number < 1 || number > 500) return null;

  let options: Record<string, string> | null = null;
  if (raw.options && typeof raw.options === "object") {
    const entries = Object.entries(raw.options)
      .filter(([k, v]) => LETTER.test(String(k).trim()) && typeof v === "string" && v.trim() !== "")
      .map(([k, v]) => [String(k).trim().toUpperCase(), String(v).trim().slice(0, 600)] as const);
    if (entries.length >= 2) options = Object.fromEntries(entries);
  }

  const answer =
    typeof raw.correct_answer === "string" && LETTER.test(raw.correct_answer.trim())
      ? raw.correct_answer.trim().toUpperCase()
      : null;

  const page = Number(raw.page_number);
  const absolutePage = Number.isInteger(page) && page > 0 ? page + pageOffset : null;

  const statement =
    typeof raw.statement === "string" && raw.statement.trim() !== ""
      ? raw.statement.trim().slice(0, 4000)
      : null;

  if (!statement && !options) return null;

  return {
    number,
    subject: typeof raw.subject === "string" ? raw.subject.trim().slice(0, 80) || null : null,
    topic: typeof raw.topic === "string" ? raw.topic.trim().slice(0, 120) || null : null,
    statement,
    options,
    correct_answer: answer,
    page_number: absolutePage && absolutePage <= pageLimit ? absolutePage : null,
    has_visual: raw.has_visual === true,
    visual_summary:
      raw.has_visual === true && typeof raw.visual_summary === "string"
        ? raw.visual_summary.trim().slice(0, 900) || null
        : null,
  };
}

/** Lê um trecho do PDF da prova e extrai as questões daquele trecho. */
export const extractExamQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        filePath: z.string().min(1),
        chunkIndex: z.number().int().min(0).default(0),
        chunkSize: z.number().int().min(1).max(12).default(PAGES_PER_CHUNK),
        pageFrom: z.number().int().min(1).optional(),
        pageTo: z.number().int().min(1).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { bytes, mime, name } = await fileBytes(context.supabase, data.filePath);
    const slice = await pdfSlice(bytes, name, {
      chunkIndex: data.chunkIndex,
      chunkSize: data.chunkSize,
      ...(data.pageFrom ? { pageFrom: data.pageFrom } : {}),
      ...(data.pageTo ? { pageTo: data.pageTo } : {}),
    });
    const part: ContentPart =
      slice?.part ?? { type: "file", file: { filename: name, file_data: toDataUrl(bytes, mime) } };
    const totalChunks = slice?.totalChunks ?? 1;
    const pageOffset = slice ? slice.firstPage - 1 : 0;
    const pageLimit = slice ? slice.lastPage : ((await pdfPageCount(bytes)) ?? 999);

    const base = {
      totalChunks,
      chunkIndex: slice ? Math.min(data.chunkIndex, totalChunks - 1) : 0,
      firstPage: slice?.firstPage ?? 1,
      lastPage: slice?.lastPage ?? pageLimit,
      isPdf: slice !== null,
    };

    try {
      const result = await aiJson<{ questions?: ExtractedQuestion[] }>(
        EXTRACT_PROMPT,
        [part, { type: "text", text: "Extraia todas as questões deste trecho da prova." }],
        { attempts: 3 },
      );
      const questions = (result.questions ?? [])
        .map((q) => normalizeQuestion(q, pageOffset, pageLimit))
        .filter((q): q is ExtractedQuestion => q !== null);
      return { ...base, questions, failed: false, retryable: false, reason: null as string | null };
    } catch (err) {
      if (err instanceof AiError && err.status === 402) throw err;
      const retryable = err instanceof AiError ? err.retryable : true;
      return {
        ...base,
        questions: [] as ExtractedQuestion[],
        failed: true,
        retryable,
        reason: err instanceof Error ? err.message : "Falha ao ler este trecho.",
      };
    }
  });

const ANSWER_KEY_PROMPT = `Você lê gabaritos oficiais de provas. Extraia o número de cada questão e a letra correta.
Formato: {"answers":[{"number":1,"answer":"C"}]}. Use letras maiúsculas (A-E). Ignore questões anuladas ou marque answer como "ANULADA".`;

/** Lê o PDF do gabarito oficial e extrai as letras (em partes, quando for grande). */
export const extractAnswerKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ filePath: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { bytes, mime, name } = await fileBytes(context.supabase, data.filePath);
    const pageCount = await pdfPageCount(bytes);
    const KEY_PAGES_PER_CHUNK = 4;
    const chunks =
      pageCount && pageCount > KEY_PAGES_PER_CHUNK
        ? Math.ceil(pageCount / KEY_PAGES_PER_CHUNK)
        : 1;

    const map = new Map<number, string>();
    let failures = 0;

    for (let index = 0; index < chunks; index += 1) {
      const slice =
        chunks > 1
          ? await pdfSlice(bytes, name, { chunkIndex: index, chunkSize: KEY_PAGES_PER_CHUNK })
          : null;
      const part: ContentPart =
        slice?.part ?? {
          type: "file",
          file: { filename: name, file_data: toDataUrl(bytes, mime) },
        };
      try {
        const result = await aiJson<{ answers?: Array<{ number: number; answer: string }> }>(
          ANSWER_KEY_PROMPT,
          [part, { type: "text", text: "Extraia o gabarito oficial deste trecho." }],
          { attempts: 3 },
        );
        for (const a of result.answers ?? []) {
          const number = Number(a?.number);
          const answer = typeof a?.answer === "string" ? a.answer.trim().toUpperCase() : "";
          if (!Number.isInteger(number) || number < 1 || number > 500) continue;
          if (!(LETTER.test(answer) || answer === "ANULADA")) continue;
          if (!map.has(number)) map.set(number, answer);
        }
      } catch (err) {
        if (err instanceof AiError && err.status === 402) throw err;
        failures += 1;
      }
    }

    const answers = [...map.entries()]
      .map(([number, answer]) => ({ number, answer }))
      .sort((a, b) => a.number - b.number);
    return { answers, failedChunks: failures, totalChunks: chunks };
  });

const ERROR_TYPES = [
  "Falta de conteúdo",
  "Desatenção",
  "Interpretação",
  "Erro de conta",
  "Chute",
  "Falta de tempo",
] as const;

function normalizeErrorType(value: string | null | undefined): string {
  if (!value) return "Interpretação";
  const cleaned = value.trim().toLowerCase();
  const match = ERROR_TYPES.find((t) => t.toLowerCase() === cleaned);
  return match ?? "Interpretação";
}

function clamp(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

const ALLOWED_SVG_TAGS = new Set([
  "svg", "g", "path", "line", "polyline", "polygon", "rect", "circle", "ellipse",
  "text", "tspan", "defs", "marker", "lineargradient", "radialgradient", "stop", "title",
]);

/** Mantém apenas SVG estático e seguro (sem script, eventos ou conteúdo externo). */
export function sanitizeSvg(input: string | null): string | null {
  if (!input) return null;
  let svg = input.trim().replace(/^```(?:svg|xml|html)?/i, "").replace(/```$/, "").trim();
  const start = svg.indexOf("<svg");
  const end = svg.lastIndexOf("</svg>");
  if (start < 0 || end < 0) return null;
  svg = svg.slice(start, end + 6);

  if (/\son[a-z]+\s*=/i.test(svg)) return null;
  if (/javascript:/i.test(svg)) return null;

  const tags = [...svg.matchAll(/<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/g)].map((m) => m[1]!.toLowerCase());
  if (tags.some((t) => !ALLOWED_SVG_TAGS.has(t))) return null;
  if (svg.length > 40000) return null;
  return svg;
}

/** Analisa o raciocínio do usuário em uma questão errada. */
export const analyzeError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        questionId: z.string().uuid(),
        explanation: z.string().trim().max(3000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: question, error } = await supabase
      .from("exam_questions")
      .select(
        "id, number, subject, topic, statement, options, correct_answer, user_answer, has_visual, visual_summary",
      )


      .eq("id", data.questionId)
      .single();
    if (error || !question) throw new Error("Questão não encontrada.");

    const VISUAL_SUBJECTS =
      /matem|f[ií]sic|qu[ií]mic|biolog|geograf|geometr|estat|trigonom|c[aá]lculo/i;
    const needsVisual = VISUAL_SUBJECTS.test(`${question.subject ?? ""} ${question.topic ?? ""}`);

    const wasCorrect =
      !!question.correct_answer &&
      !!question.user_answer &&
      question.correct_answer === question.user_answer;

    const analysis = await aiJson<{
      why_wrong: string;
      correct_reasoning: string;
      error_type: string;
      concept: string;
      steps?: Array<{ title?: string; detail?: string; status?: string }> | null;
      misstep_step?: number | null;
      option_analysis?: Array<{ letter?: string; verdict?: string; why?: string }> | null;
      statement_clues?: Array<{ quote?: string; why?: string }> | null;
      visual_svg?: string | null;
      visual_caption?: string | null;
    }>(
      `Você é um professor particular de simulados em português do Brasil. O aluno ${
        wasCorrect
          ? "ACERTOU a questão e explicou o raciocínio. Confirme se ele acertou pelo motivo certo ou por sorte/atalho arriscado."
          : "ERROU a questão e explicou o raciocínio que o levou à alternativa marcada. Seja cirúrgico: mostre exatamente em qual etapa o pensamento dele saiu do trilho."
      }

Regras para cada campo:
- why_wrong: ${
        wasCorrect
          ? "confirme o que ele fez bem citando a explicação dele e aponte qualquer passo frágil ou sorte envolvida. 2 a 4 frases."
          : "ataque DIRETAMENTE o raciocínio descrito pelo aluno, citando trechos dele. Identifique a confusão conceitual específica ou o passo pulado. Sem conselhos genéricos. 2 a 4 frases."
      }
- correct_reasoning: caminho correto em passos numerados e curtos, do enunciado até a alternativa certa. Se for cálculo, mostre a conta. 3 a 6 passos.
- steps: o MESMO caminho como lista de objetos {title, detail, status}, 3 a 6 itens, na ordem da resolução.
  title: nome curto da etapa (máx. 8 palavras). detail: o que fazer nessa etapa e o resultado (1 a 3 frases).
  status: "ok" quando o aluno cumpriu essa etapa corretamente; "erro" na etapa exata onde ele se confundiu (no máximo uma etapa "erro"); "atencao" quando ele passou raspando, pulou ou não deu evidência. Se ele acertou tudo, todas ficam "ok".
- misstep_step: o número (1-based) da etapa com status "erro", ou null se não houver.
- option_analysis: uma entrada por alternativa existente: {letter, verdict, why}. verdict é exatamente "correta", "pegadinha" ou "descartavel". "pegadinha" para as que atraem quem cometeu o erro do aluno (inclua a marcada por ele quando errada). why: 1 frase dizendo por que atrai ou por que cai.
- statement_clues: 1 a 3 trechos LITERAIS do enunciado que decidem a resposta: {quote, why}. quote copiado do enunciado (máx. 140 caracteres); why explica o peso do trecho. Se o enunciado não estiver disponível, devolva [].
- error_type: exatamente um destes valores: ${ERROR_TYPES.join(" | ")}
- concept: o conceito específico que o aluno deve revisar (máximo 6 palavras).
- visual_svg: ${
        needsVisual
          ? `OBRIGATÓRIO para esta matéria. Um desenho explicativo em SVG puro e autocontido que ilustre o conceito ou o passo a passo correto.
  Regras do SVG: comece com <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" width="100%">; use apenas as tags svg, g, path, line, polyline, polygon, rect, circle, ellipse, text, tspan, defs, marker, linearGradient, stop; NUNCA use script, image, foreignObject, style externo nem eventos on*.
  Cores: use APENAS currentColor (texto), var(--color-sun) (destaque), var(--color-sun-deep) (apoio), var(--color-destructive) (errado) e var(--color-muted-foreground) (eixos). Fundo transparente. Texto com font-size entre 11 e 14 e fill="currentColor".
  Rotule eixos, pontos e valores relevantes.`
          : `use null (matéria não exige desenho)`
      }
- visual_caption: legenda curta explicando o desenho (ou null se não houver)

Se a resposta_do_aluno for nula ou vazia, trate como questão em branco e explique o que ele deveria ter notado.
Se enunciado_incompleto for true, o enunciado original tinha imagem, gráfico ou tabela que não foi transcrita: baseie-se na explicação do aluno, no assunto e no gabarito, e diga explicitamente quando algo depender da figura da prova.`,

      [
        {
          type: "text",
          text: JSON.stringify({
            questao: question.number,
            materia: question.subject,
            assunto: question.topic,
            enunciado: question.statement,
            alternativas: question.options,
            gabarito_oficial: question.correct_answer,
            resposta_do_aluno: question.user_answer,
            acertou: wasCorrect,
            enunciado_incompleto: question.has_visual === true && !question.visual_summary,
            leitura_da_figura: question.visual_summary ?? null,


            explicacao_do_aluno: data.explanation || null,
          }),
        },
      ],
    );

    const visualSvg = sanitizeSvg(analysis.visual_svg ?? null);
    const whyWrong =
      clamp(analysis.why_wrong, 1200) ??
      "Não foi possível identificar o erro específico no raciocínio descrito.";
    const correctReasoning =
      clamp(analysis.correct_reasoning, 2000) ??
      "Revise o enunciado e o gabarito oficial para reconstruir o raciocínio correto.";
    const visualCaption = visualSvg ? clamp(analysis.visual_caption, 300) : null;

    const STEP_STATUS = new Set(["ok", "erro", "atencao"]);
    const steps = (Array.isArray(analysis.steps) ? analysis.steps : [])
      .slice(0, 8)
      .map((step, index) => ({
        title: clamp(step?.title, 120) ?? `Etapa ${index + 1}`,
        detail: clamp(step?.detail, 600) ?? "",
        status: STEP_STATUS.has(String(step?.status)) ? String(step?.status) : "ok",
      }));
    const misstepIndex = steps.findIndex((s) => s.status === "erro");
    const misstepStep =
      misstepIndex >= 0
        ? misstepIndex + 1
        : Number.isFinite(Number(analysis.misstep_step))
          ? Number(analysis.misstep_step)
          : null;

    const VERDICTS = new Set(["correta", "pegadinha", "descartavel"]);
    const optionAnalysis = (Array.isArray(analysis.option_analysis) ? analysis.option_analysis : [])
      .slice(0, 8)
      .flatMap((item) => {
        const letter = clamp(item?.letter, 4);
        if (!letter) return [];
        return [
          {
            letter: letter.toUpperCase(),
            verdict: VERDICTS.has(String(item?.verdict)) ? String(item?.verdict) : "descartavel",
            why: clamp(item?.why, 300) ?? "",
          },
        ];
      });

    const statementClues = (Array.isArray(analysis.statement_clues) ? analysis.statement_clues : [])
      .slice(0, 3)
      .flatMap((item) => {
        const quote = clamp(item?.quote, 200);
        if (!quote) return [];
        return [{ quote, why: clamp(item?.why, 300) ?? "" }];
      });

    const { data: saved, error: saveError } = await supabase
      .from("error_reviews")
      .upsert(
        {
          question_id: question.id,
          user_id: userId,
          user_explanation: data.explanation,
          why_wrong: whyWrong,
          correct_reasoning: correctReasoning,
          error_type: normalizeErrorType(analysis.error_type),
          concept: clamp(analysis.concept, 100) ?? "Revisar o assunto da questão",
          steps,
          misstep_step: misstepStep,
          option_analysis: optionAnalysis,
          statement_clues: statementClues,
          was_correct: wasCorrect,
          visual_svg: visualSvg,
          visual_caption: visualCaption,
        },
        { onConflict: "question_id" },
      )
      .select()
      .single();
    if (saveError) throw new Error(saveError.message);
    return saved;
  });


/** Gera um plano de revisão a partir dos erros recentes (ou de um simulado específico). */
export const generateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ examId: z.string().uuid().optional() }).optional().parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const examId = data?.examId;

    let examsQuery = supabase
      .from("exams")
      .select("id, title, exam_date, total_questions, correct_count")
      .eq("user_id", userId)
      .order("exam_date", { ascending: false });
    examsQuery = examId ? examsQuery.eq("id", examId) : examsQuery.limit(8);
    const { data: exams } = await examsQuery;

    const examIds = (exams ?? []).map((e) => e.id);
    if (examIds.length === 0)
      throw new Error("Cadastre pelo menos um simulado antes de gerar o plano.");

    const { data: wrong } = await supabase
      .from("exam_questions")
      .select("id, subject, topic, correct_answer, user_answer, exam_id")
      .in("exam_id", examIds)
      .eq("is_correct", false);

    let reviewsQuery = supabase
      .from("error_reviews")
      .select("error_type, concept, question_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(120);
    const wrongIds = (wrong ?? []).map((q) => q.id);
    if (examId) {
      if (wrongIds.length === 0) reviewsQuery = reviewsQuery.limit(0);
      else reviewsQuery = reviewsQuery.in("question_id", wrongIds);
    }
    const { data: reviews } = await reviewsQuery;

    const { data: subjectRows } = await supabase
      .from("subjects")
      .select("id, name, parent_id")
      .eq("user_id", userId);
    const subjectList = (subjectRows ?? []).map((s) => ({
      id: s.id,
      nome: s.parent_id
        ? `${(subjectRows ?? []).find((p) => p.id === s.parent_id)?.name ?? ""} · ${s.name}`
        : s.name,
      link: `/materia/${s.id}`,
    }));

    const linkRule = `
Sempre que citar uma matéria ou frente que exista na lista "materias_do_fichario", transforme o nome em link markdown usando o campo "link" (ex.: [Biologia · Frente 2](/materia/uuid)). Nunca invente links.`;


    const plan = await aiText(
      examId
        ? `Você é um mentor de estudos. Escreva, em português do Brasil e em markdown, um plano de revisão focado APENAS neste simulado que o aluno acabou de corrigir.
Estrutura obrigatória:
## Diagnóstico deste simulado
## Prioridades de revisão (lista numerada: matéria, assunto e o motivo)
## Como estudar cada prioridade
## O que treinar antes do próximo simulado
Seja específico e curto: no máximo 350 palavras. Use listas e **negrito** nos assuntos.

Ilustre quando ajudar a explicar (não em todo tópico, só quando um desenho vale mais que texto).
Para isso, escreva um bloco de código com a linguagem \`grafico\` ou \`esquema\` e um JSON válido dentro:

\`\`\`grafico
{"tipo":"barra","titulo":"Distribuicao","legenda":"o que o grafico mostra","eixoX":"x","eixoY":"y","dados":[{"nome":"A","valor":30},{"nome":"B","valor":70}]}
\`\`\`

\`\`\`esquema
{"tipo":"etapas","titulo":"Como resolver","itens":[{"titulo":"1o passo","texto":"explicacao curta"},{"titulo":"2o passo","texto":"explicacao curta"}]}
\`\`\`

Tipos de grafico: barra, linha, pizza (sempre com "dados" numericos reais do conteudo).
Tipos de esquema: etapas, fluxo, ciclo, comparacao, linha_do_tempo (sempre com "itens").
O JSON precisa ser valido, em uma unica linha por chave, sem comentarios. Nunca invente numeros que nao vieram do conteudo.
Use no maximo 6 ilustracoes por texto e sempre explique a ilustracao em texto tambem.${linkRule}`
        : `Você é um mentor de estudos. Com base no desempenho recente do aluno, escreva um plano de revisão em português do Brasil, em markdown simples.
Estrutura obrigatória:
## Diagnóstico
## Prioridades da semana (lista numerada com matéria, assunto e o motivo)
## Como estudar cada prioridade
## Hábitos para corrigir (baseado nos tipos de erro)
Seja específico e curto: no máximo 400 palavras. Use listas e **negrito** nos assuntos.

Ilustre quando ajudar a explicar (não em todo tópico, só quando um desenho vale mais que texto).
Para isso, escreva um bloco de código com a linguagem \`grafico\` ou \`esquema\` e um JSON válido dentro:

\`\`\`grafico
{"tipo":"barra","titulo":"Distribuicao","legenda":"o que o grafico mostra","eixoX":"x","eixoY":"y","dados":[{"nome":"A","valor":30},{"nome":"B","valor":70}]}
\`\`\`

\`\`\`esquema
{"tipo":"etapas","titulo":"Como resolver","itens":[{"titulo":"1o passo","texto":"explicacao curta"},{"titulo":"2o passo","texto":"explicacao curta"}]}
\`\`\`

Tipos de grafico: barra, linha, pizza (sempre com "dados" numericos reais do conteudo).
Tipos de esquema: etapas, fluxo, ciclo, comparacao, linha_do_tempo (sempre com "itens").
O JSON precisa ser valido, em uma unica linha por chave, sem comentarios. Nunca invente numeros que nao vieram do conteudo.
Use no maximo 6 ilustracoes por texto e sempre explique a ilustracao em texto tambem.${linkRule}`,
      [
        {
          type: "text",
          text: JSON.stringify({
            simulados: exams,
            questoes_erradas: wrong ?? [],
            revisoes: reviews ?? [],
            materias_do_fichario: subjectList,
          }),
        },
      ],

    );

    const { data: saved, error } = await supabase
      .from("study_plans")
      .insert({ user_id: userId, content: plan, exam_id: examId ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return saved;
  });

const VISUAL_PROMPT = `Você lê figuras de provas (gráficos, tabelas, mapas, esquemas, obras de arte, tirinhas, figuras geométricas) e as transcreve em texto para alunos que vão resolver a questão sem ver a imagem.
Devolva {"kind":"grafico|tabela|mapa|figura|imagem|nenhum","visual_summary":"...","confianca":"alta|media|baixa"}.
Regras do visual_summary (máximo 900 caracteres, texto puro, português do Brasil):
- Gráfico: tipo do gráfico, o que está em cada eixo com unidade e escala (mínimo, máximo e passo), e a lista de TODOS os pontos/barras com os VALORES EXATOS lidos (ex.: "2015=1,2; 2016=1,8; pico em 2019=4,0"). Inclua legenda de cores/séries.
- Tabela: transcreva cabeçalhos e todas as células, linha por linha, com as unidades.
- Mapa/esquema/figura geométrica: elementos, rótulos, medidas, ângulos, escala e legenda.
- Imagem, foto, obra de arte ou tirinha: descreva o que aparece, textos visíveis, ordem dos quadrinhos e o detalhe que a questão precisa.
Use confianca "baixa" quando a imagem estiver borrada ou cortada.
Nunca invente números. Se um valor não for legível, escreva o que consegue ver e termine com "valores não legíveis no PDF".
Se a questão não tiver figura, use kind "nenhum" e visual_summary "".`;

const CHECK_PROMPT = `Você confere a transcrição de uma figura de prova comparando-a com a imagem em alta resolução.
Corrija números errados, complete pontos que faltaram e remova o que não está na imagem.
Devolva {"visual_summary":"...","confianca":"alta|media|baixa"} com a versão final (máximo 900 caracteres, texto puro, português do Brasil). Nunca invente valores.`;

type VisualResult = {
  visual_summary: string;
  confianca?: string | undefined;
  kind?: string | undefined;
};

/** Imagem da página enviada pelo navegador (data URL), quando disponível. */
const pageImageSchema = z
  .string()
  .startsWith("data:image/")
  .max(12_000_000)
  .optional()
  .nullable();

/**
 * Lê a figura com base na imagem em alta resolução da página (quando o navegador
 * conseguiu desenhá-la) e/ou no próprio PDF, e confere os valores num segundo passe.
 */
async function readVisualParts(
  parts: ContentPart[],
  info: Record<string, unknown>,
  hasImage: boolean,
): Promise<VisualResult> {
  const payload: ContentPart = { type: "text", text: JSON.stringify(info) };
  const first = await aiJson<VisualResult>(VISUAL_PROMPT, [...parts, payload]);
  const summary = String(first?.visual_summary ?? "").trim();
  const kind = String(first?.kind ?? "").toLowerCase();
  if (!summary) return { visual_summary: "", kind, confianca: "baixa" };

  // Gráficos e tabelas dependem de números exatos: confere na própria imagem.
  const needsCheck = hasImage && (kind === "grafico" || kind === "tabela");
  if (!needsCheck) return { ...first, visual_summary: summary, kind };

  try {
    const checked = await aiJson<VisualResult>(CHECK_PROMPT, [
      ...parts,
      { type: "text", text: JSON.stringify({ ...info, transcricao_para_conferir: summary }) },
    ]);
    const fixed = String(checked?.visual_summary ?? "").trim();
    return {
      kind,
      confianca: checked?.confianca ?? first.confianca,
      visual_summary: fixed.length >= Math.min(40, summary.length) ? fixed : summary,
    };
  } catch {
    return { ...first, visual_summary: summary, kind };
  }
}

/**
 * Lê a figura/gráfico da questão e devolve a descrição com os valores exatos
 * (eixos, pontos, tabela), salvando em visual_summary.
 */
export const readQuestionVisual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        questionId: z.string().uuid(),
        pageImage: pageImageSchema,
        force: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: question, error } = await supabase
      .from("exam_questions")
      .select("id, number, statement, options, page_number, visual_summary, exam_id")
      .eq("id", data.questionId)
      .single();
    if (error || !question) throw new Error("Questão não encontrada.");
    if (question.visual_summary && !data.force)
      return { visual_summary: question.visual_summary as string };

    const parts: ContentPart[] = [];
    if (data.pageImage) parts.push({ type: "image_url", image_url: { url: data.pageImage } });

    if (parts.length === 0) {
      const { data: exam } = await supabase
        .from("exams")
        .select("exam_file_path")
        .eq("id", question.exam_id)
        .maybeSingle();
      if (!exam?.exam_file_path)
        throw new Error("Esta questão não tem o arquivo da prova para ler a figura.");
      const { bytes, mime, name } = await fileBytes(supabase, exam.exam_file_path);
      const page = Number(question.page_number) || 0;
      const slice =
        page > 0 ? await pdfSlice(bytes, name, { chunkIndex: 0, chunkSize: 1, pageFrom: page, pageTo: page }) : null;
      parts.push(
        slice?.part ?? { type: "file", file: { filename: name, file_data: toDataUrl(bytes, mime) } },
      );
    }

    const result = await readVisualParts(
      parts,
      {
        questao: question.number,
        pagina_do_pdf: question.page_number,
        enunciado: question.statement,
        alternativas: question.options,
      },
      Boolean(data.pageImage),
    );

    const summary = result.visual_summary.slice(0, 900);
    if (!summary) throw new Error("Não encontrei figura legível para esta questão.");
    await supabase
      .from("exam_questions")
      .update({ visual_summary: summary, has_visual: true })
      .eq("id", question.id);
    return { visual_summary: summary, confianca: result.confianca ?? null };
  });

/**
 * Lê a figura a partir da imagem da página, antes do simulado existir no banco
 * (usado na tela de importação da prova).
 */
export const readVisualFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        pageImage: z.string().startsWith("data:image/").max(12_000_000),
        number: z.number().int().min(1).max(500).optional(),
        statement: z.string().max(4000).optional().nullable(),
        options: z.record(z.string(), z.string()).optional().nullable(),
        page: z.number().int().min(1).max(2000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const result = await readVisualParts(
      [{ type: "image_url", image_url: { url: data.pageImage } }],
      {
        questao: data.number ?? null,
        pagina_do_pdf: data.page ?? null,
        enunciado: data.statement ?? null,
        alternativas: data.options ?? null,
      },
      true,
    );
    const summary = result.visual_summary.slice(0, 900);
    if (!summary) throw new Error("Não encontrei figura legível nesta página.");
    return { visual_summary: summary, confianca: result.confianca ?? null };
  });

