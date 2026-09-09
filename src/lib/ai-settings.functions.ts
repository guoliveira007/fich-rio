import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const GROQ_MODELS = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Melhor para Simulados)" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Ultra Rápido)" },
] as const;

const modelSchema = z.enum(["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]);

/** Configurações de IA da pessoa logada. A chave nunca volta ao navegador. */
export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("ai_settings")
      .select("groq_api_key,groq_model")
      .eq("user_id", context.userId)
      .maybeSingle();

    const key = data?.groq_api_key ?? "";
    return {
      hasKey: key.length > 0,
      maskedKey: key ? `${"*".repeat(Math.max(8, key.length - 4))}${key.slice(-4)}` : "",
      model: (data?.groq_model as string | undefined) ?? "llama-3.3-70b-versatile",
    };
  });

const saveInput = z.object({
  /** vazio = manter a chave atual; null = remover */
  groqApiKey: z.string().max(300).nullable().optional(),
  model: modelSchema,
});

export const saveAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => saveInput.parse(raw))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      user_id: context.userId,
      groq_model: data.model,
      updated_at: new Date().toISOString(),
    };
    if (data.groqApiKey === null) patch["groq_api_key"] = null;
    else if (typeof data.groqApiKey === "string" && data.groqApiKey.trim())
      patch["groq_api_key"] = data.groqApiKey.trim();

    const { error } = await context.supabase
      .from("ai_settings")
      .upsert(patch as never, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const testInput = z.object({
  /** chave digitada agora; se vazio, testa a chave já salva */
  groqApiKey: z.string().max(300).optional(),
  model: modelSchema,
});

/** Faz uma chamada mínima à Groq para conferir se a chave funciona. */
export const testAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => testInput.parse(raw))
  .handler(async ({ data, context }) => {
    let key = data.groqApiKey?.trim() ?? "";
    if (!key) {
      const { data: row } = await context.supabase
        .from("ai_settings")
        .select("groq_api_key")
        .eq("user_id", context.userId)
        .maybeSingle();
      key = (row?.groq_api_key ?? "").trim();
    }
    if (!key) return { ok: false as const, message: "Nenhuma chave informada ou salva." };

    let res: Response;
    try {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: data.model,
          max_tokens: 5,
          messages: [{ role: "user", content: "ok" }],
        }),
      });
    } catch {
      return { ok: false as const, message: "Não foi possível falar com a Groq agora." };
    }

    if (res.ok) return { ok: true as const, message: "Chave válida — a IA está pronta para usar." };

    const body = await res.text();
    console.error(`Groq test failed [${res.status}]: ${body}`);
    if (res.status === 401)
      return { ok: false as const, message: "Chave recusada pela Groq. Confira se copiou inteira." };
    if (res.status === 404)
      return { ok: false as const, message: "Esse modelo não está disponível para a sua conta." };
    if (res.status === 429)
      return { ok: false as const, message: "Limite da sua conta Groq atingido. Tente mais tarde." };
    return { ok: false as const, message: `A Groq respondeu com erro ${res.status}.` };
  });
