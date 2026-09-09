import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { BOARDS, boardById } from "@/lib/boards";
import { fetchBoardCounts } from "@/lib/boards-data";

export const Route = createFileRoute("/bancas/")({
  head: () => ({
    meta: [
      { title: "Bancas — Fichário" },
      {
        name: "description",
        content: "Gerencie editais e provas antigas por banca: FUVEST, UNICAMP, UNESP, UNIFESP e ENEM.",
      },
      { property: "og:title", content: "Bancas — Fichário" },
      {
        property: "og:description",
        content: "Editais e as 10 últimas provas de cada vestibular em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <BancasPage />
    </AppShell>
  ),
});

function BancasPage() {
  const counts = useQuery({
    queryKey: ["board-counts"],
    queryFn: async () => {
      const map: Record<string, { editais: number; provas: number }> = {};
      for (const b of BOARDS) {
        map[b.id] = await fetchBoardCounts(b.name);
      }
      return map;
    },
  });

  return (
    <>
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">Vestibulares</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Bancas</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Envie editais atualizados e as provas antigas de cada banca. Use-os para gerar questões
          inéditas e simulados no estilo certo.
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BOARDS.map((b) => {
          const c = counts.data?.[b.id] ?? { editais: 0, provas: 0 };
          return (
            <Link
              key={b.id}
              to="/bancas/$boardId"
              params={{ boardId: b.id }}
              className="rounded-xl border border-line bg-card p-5 transition-colors hover:border-sun"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                {b.reference}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold">{b.name}</h2>
              <div className="mt-4 flex gap-3">
                <span className="rounded-full bg-sun/10 px-2.5 py-1 font-mono text-[10px] text-sun-deep">
                  {c.editais} edital{c.editais === 1 ? "" : "is"}
                </span>
                <span className="rounded-full bg-sun/10 px-2.5 py-1 font-mono text-[10px] text-sun-deep">
                  {c.provas} prova{c.provas === 1 ? "" : "s"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
