import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { claimImportedData } from "@/lib/import-claim.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/importar")({
  head: () => ({
    meta: [
      { title: "Recuperar seus dados — Fichário" },
      {
        name: "description",
        content:
          "Use seu código para ligar à sua conta as matérias, materiais, flashcards e simulados importados para o Fichário.",
      },
      { property: "og:title", content: "Recuperar seus dados no Fichário" },
      {
        property: "og:description",
        content: "Ligue à sua conta os dados de estudo importados para o Fichário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportarPage,
});

function ImportarPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/entrar" });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("claim_imported_data", { _code: code.trim() });
      if (error) throw error;
      if (data === "ok") {
        toast.success("Pronto! Seus dados já estão nesta conta.");
        navigate({ to: "/" });
        return;
      }
      if (data === "codigo_invalido") {
        toast.error("Código inválido ou já utilizado.");
        return;
      }
      toast.error("Entre na sua conta para continuar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance">
          Recuperar seus dados
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Digite o código de recuperação para ligar à sua conta as matérias, materiais, flashcards,
          simulados e resumos que já foram importados. Isso só funciona uma vez.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3 rounded-xl border border-line bg-card p-5">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              Código
            </label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sun"
              placeholder="FICHARIO-0000"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-sun px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-sun-deep disabled:opacity-50"
          >
            {busy ? "Ligando…" : "Ligar à minha conta"}
          </button>
        </form>
      </div>
    </main>
  );
}
