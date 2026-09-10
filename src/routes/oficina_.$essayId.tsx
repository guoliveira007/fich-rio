import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/error-message";
import { coachScript } from "@/data/redacao-coach";
import { getBoard, type BoardId } from "@/data/redacao-guide";
import { Workshop, rebuildWritten, type Written } from "./oficina";

export const Route = createFileRoute("/oficina_/$essayId")({
  head: () => ({
    meta: [
      { title: "Continuar treino guiado de redação | Fichário" },
      {
        name: "description",
        content:
          "Retome o rascunho da sua oficina de redação exatamente no período em que parou, com a devolutiva do professor de IA.",
      },
      { property: "og:title", content: "Continuar treino guiado de redação" },
      {
        property: "og:description",
        content: "Volte ao seu rascunho e siga escrevendo período a período com correção imediata.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <ResumePage />
    </AppShell>
  ),
});

type Loaded = {
  session: { essayId: string; title: string; prompt: string; board: BoardId };
  written: Written[];
  minutes: number;
};

function ResumePage() {
  const { essayId } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { data, error: err } = await supabase
          .from("essays")
          .select("id, board, theme_title, theme_prompt, text, minutes")
          .eq("id", essayId)
          .single();
        if (err || !data) throw err ?? new Error("Rascunho não encontrado.");
        const board = getBoard(String(data.board ?? "FUVEST")).id;
        if (!alive) return;
        setState({
          session: {
            essayId: data.id,
            title: data.theme_title,
            prompt: String(data.theme_prompt ?? ""),
            board,
          },
          written: rebuildWritten(coachScript(board), String(data.text ?? "")),
          minutes: Number(data.minutes ?? 0),
        });
      } catch (err) {
        if (alive) setError(errorMessage(err, "Não consegui abrir este rascunho."));
      }
    })();
    return () => {
      alive = false;
    };
  }, [essayId]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-2xl font-bold">Rascunho indisponível</h1>
        <p className="mt-2 text-sm text-ink-soft">{error}</p>
        <Link
          to="/redacao"
          className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-sun-deep hover:underline"
        >
          voltar para redação
        </Link>
      </div>
    );
  }

  if (!state) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Loader2 className="size-4 animate-spin" /> Carregando seu rascunho…
      </p>
    );
  }

  return (
    <Workshop
      session={state.session}
      initialWritten={state.written}
      initialMinutes={state.minutes}
      onExit={() => void navigate({ to: "/redacao" })}
    />
  );
}
