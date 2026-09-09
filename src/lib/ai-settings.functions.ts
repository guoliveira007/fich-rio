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
