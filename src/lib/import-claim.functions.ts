import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const codeSchema = z.object({
  code: z.string().trim().min(4).max(64),
});

/**
 * Liga os dados importados à conta da pessoa logada.
 * A função de banco é privilegiada e só pode ser chamada aqui, depois da
 * verificação do token — nunca direto do navegador.
 */
export const claimImportedData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => codeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: result, error } = await supabaseAdmin.rpc("claim_imported_data", {
      _code: data.code,
      _user_id: context.userId,
    });

    if (error) {
      console.error("[claimImportedData]", error);
      throw new Error("Não foi possível continuar. Tente de novo.");
    }

    return { status: (result as string | null) ?? "codigo_invalido" };
  });
