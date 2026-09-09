const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export class AiError extends Error {
  status: number;
  /** true quando vale a pena tentar de novo (limite temporário ou falha do serviço). */
  retryable: boolean;
  /** espera sugerida pelo serviço, em segundos. */
  delaySeconds: number;
  constructor(status: number, message: string, retryable = false, delaySeconds = 0) {
    super(message);
    this.status = status;
    this.retryable = retryable;
    this.delaySeconds = Number.isFinite(delaySeconds) && delaySeconds > 0 ? delaySeconds : 0;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CallOptions = { json?: boolean; maxTokens?: number; attempts?: number };

async function callGatewayOnce(
  messages: unknown[],
  options: CallOptions,
): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError(500, "A IA não está configurada neste projeto.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: options.maxTokens ?? 32000,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") ?? 0);
      throw new AiError(
        429,
        "Muitas requisições à IA agora. Tente novamente em alguns instantes.",
        true,
        retryAfter,
      );
    }
    if (res.status === 402)
      throw new AiError(
        402,
        "Os créditos de IA acabaram. Recarregue para continuar usando a correção automática.",
      );
    throw new AiError(
      res.status,
      `Falha na IA (${res.status}): ${body.slice(0, 300)}`,
      res.status >= 500,
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const choice = json.choices?.[0];
  const content = choice?.message?.content ?? "";
  if (!content.trim()) throw new AiError(502, "A IA devolveu uma resposta vazia.", true);
  return content;
}


const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Chave Groq guardada pela pessoa logada — usada só como reserva. */
async function loadGroqFallback(): Promise<{ key: string; model: string } | null> {
  const { currentAiUserId } = await import("@/lib/ai-user-context.server");
  const userId = currentAiUserId();
  if (!userId) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_settings")
      .select("groq_api_key,groq_model")
      .eq("user_id", userId)
      .maybeSingle();
    const key = (data?.groq_api_key ?? "").trim();
    if (!key) return null;
    return { key, model: (data?.groq_model ?? "llama-3.3-70b-versatile").trim() };
  } catch (err) {
    console.error("Não foi possível ler a chave de reserva:", err);
    return null;
  }
}

/** Converte as partes multimodais em texto simples (a reserva é só texto). */
function flattenMessages(messages: unknown[]) {
  return messages.map((message) => {
    const m = message as { role: string; content: unknown };
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    const parts = Array.isArray(m.content) ? (m.content as ContentPart[]) : [];
    const text = parts
      .map((p) => (p.type === "text" ? p.text : `[${p.type} não suportado na IA de reserva]`))
      .join("\n\n");
    return { role: m.role, content: text };
  });
}

async function callGroqFallback(messages: unknown[], options: CallOptions): Promise<string> {
  const fallback = await loadGroqFallback();
  if (!fallback) return "";

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${fallback.key}`,
    },
    body: JSON.stringify({
      model: fallback.model,
      messages: flattenMessages(messages),
      max_tokens: Math.min(options.maxTokens ?? 8000, 8000),
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    console.error(`Reserva Groq falhou com status ${res.status}`);
    return "";
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callGateway(messages: unknown[], options: CallOptions = {}): Promise<string> {
  const attempts = Math.max(1, options.attempts ?? 3);
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await callGatewayOnce(messages, options);
    } catch (err) {
      lastError = err;
      const status = err instanceof AiError ? err.status : 0;
      // Créditos da IA inclusa acabaram (ou limite persistente): tenta a chave da pessoa.
      if (status === 402 || (status === 429 && attempt === attempts - 1)) {
        const text = await callGroqFallback(messages, options);
        if (text.trim()) return text;
      }
      const retryable = err instanceof AiError ? err.retryable : true;
      if (!retryable || attempt === attempts - 1) break;
      const suggested = err instanceof AiError ? err.delaySeconds : 0;
      const backoff = suggested > 0 ? suggested * 1000 : 800 * 2 ** attempt;
      await sleep(backoff + Math.random() * 300);
    }
  }
  throw lastError;
}

export async function aiText(
  system: string,
  parts: ContentPart[],
  options: CallOptions = {},
): Promise<string> {
  return callGateway(
    [
      { role: "system", content: system },
      { role: "user", content: parts },
    ],
    options,
  );
}

/** Tenta consertar JSON cortado no meio (resposta truncada pelo limite de tokens). */
/** Pilha de fechamentos pendentes de um JSON possivelmente incompleto. */
function pendingClosers(text: string): { closers: string[]; inString: boolean } {
  const closers: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") closers.push("}");
    else if (ch === "[") closers.push("]");
    else if (ch === "}" || ch === "]") closers.pop();
  }
  return { closers, inString };
}

export function repairJson(input: string): string | null {
  let text = input.trim();
  // corta uma string aberta no fim da resposta
  if (pendingClosers(text).inString) {
    const cut = text.lastIndexOf('"');
    if (cut > 0) text = text.slice(0, cut);
  }

  // vai descartando os últimos itens incompletos até fechar bem
  for (let round = 0; round < 4; round += 1) {
    const lastComplete = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (lastComplete <= 0) break;
    let candidate = text.slice(0, lastComplete + 1).replace(/,\s*$/, "");
    const { closers } = pendingClosers(candidate);
    candidate += [...closers].reverse().join("");
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      text = text.slice(0, lastComplete);
    }
  }
  return null;
}

export function parseJsonLoose<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(slice) as T;
  } catch {
    const base = start >= 0 ? cleaned.slice(start) : cleaned;
    const repaired = repairJson(base);
    if (repaired) return JSON.parse(repaired) as T;
    throw new AiError(502, "A IA devolveu uma resposta em formato inesperado.", true);
  }
}

export async function aiJson<T>(
  system: string,
  parts: ContentPart[],
  options: CallOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const raw = await aiText(
        `${system}\n\nResponda SOMENTE com JSON válido, sem comentários e sem blocos de código.`,
        parts,
        { ...options, json: true, attempts: 1 },
      );
      return parseJsonLoose<T>(raw);
    } catch (err) {
      lastError = err;
      const retryable = err instanceof AiError ? err.retryable : true;
      if (!retryable || attempt === attempts - 1) break;
      const suggested = err instanceof AiError ? err.delaySeconds : 0;
      await sleep((suggested > 0 ? suggested * 1000 : 800 * 2 ** attempt) + Math.random() * 300);
    }
  }
  throw lastError;
}

export function toDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
