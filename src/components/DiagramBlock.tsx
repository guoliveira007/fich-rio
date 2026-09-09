import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight } from "lucide-react";

import { cleanText } from "@/lib/text";

/** Cores do fichário usadas nas ilustrações. */
const COLORS = [
  "hsl(var(--sun))",
  "hsl(var(--sun-deep))",
  "hsl(var(--ink))",
  "hsl(var(--ink-soft))",
  "hsl(var(--accent))",
];

type ChartSpec = {
  tipo: "barra" | "linha" | "pizza" | "bar" | "line" | "pie";
  titulo?: string;
  legenda?: string;
  eixoX?: string;
  eixoY?: string;
  dados: Array<{ nome?: string; label?: string; valor?: number; value?: number }>;
};

type SchemeSpec = {
  tipo: "fluxo" | "etapas" | "ciclo" | "comparacao" | "linha_do_tempo";
  titulo?: string;
  legenda?: string;
  itens: Array<
    | string
    | { titulo?: string; nome?: string; texto?: string; descricao?: string; lado?: string }
  >;
};

type Spec = ChartSpec | SchemeSpec;

function isChart(spec: Spec): spec is ChartSpec {
  return ["barra", "linha", "pizza", "bar", "line", "pie"].includes(spec.tipo);
}

function Figure({
  title,
  caption,
  children,
}: {
  title?: string | undefined;
  caption?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-4 rounded-xl border border-line bg-paper p-4">
      {title && (
        <figcaption className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-sun-deep">
          {cleanText(title)}
        </figcaption>
      )}
      {children}
      {caption && <p className="mt-3 text-xs text-ink-soft">{cleanText(caption)}</p>}
    </figure>
  );
}

function ChartFigure({ spec }: { spec: ChartSpec }) {
  const data = (spec.dados ?? [])
    .map((d) => ({
      name: cleanText(d.nome ?? d.label ?? ""),
      value: Number(d.valor ?? d.value ?? 0),
    }))
    .filter((d) => d.name && Number.isFinite(d.value));
  if (data.length === 0) return null;
  const kind = spec.tipo === "bar" ? "barra" : spec.tipo === "line" ? "linha" : spec.tipo === "pie" ? "pizza" : spec.tipo;

  return (
    <Figure title={spec.titulo} caption={spec.legenda}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "pizza" ? (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : kind === "linha" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--line))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={COLORS[1]} strokeWidth={2} dot />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--line))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {(spec.eixoX || spec.eixoY) && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {spec.eixoX ? `x: ${cleanText(spec.eixoX)}` : ""}
          {spec.eixoX && spec.eixoY ? " · " : ""}
          {spec.eixoY ? `y: ${cleanText(spec.eixoY)}` : ""}
        </p>
      )}
    </Figure>
  );
}

function SchemeFigure({ spec }: { spec: SchemeSpec }) {
  const items = (spec.itens ?? []).map((item) =>
    typeof item === "string"
      ? { title: cleanText(item), text: "", side: "" }
      : {
          title: cleanText(item.titulo ?? item.nome ?? ""),
          text: cleanText(item.texto ?? item.descricao ?? ""),
          side: cleanText(item.lado ?? ""),
        },
  );
  if (items.length === 0) return null;

  if (spec.tipo === "comparacao") {
    return (
      <Figure title={spec.titulo} caption={spec.legenda}>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-line bg-card p-3">
              {item.side && (
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                  {item.side}
                </p>
              )}
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              {item.text && <p className="mt-1 text-sm text-ink-soft">{item.text}</p>}
            </div>
          ))}
        </div>
      </Figure>
    );
  }

  if (spec.tipo === "fluxo" || spec.tipo === "ciclo") {
    return (
      <Figure title={spec.titulo} caption={spec.legenda}>
        <div className="flex flex-wrap items-stretch gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="max-w-[220px] rounded-lg border border-line bg-card px-3 py-2">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.text && <p className="mt-0.5 text-xs text-ink-soft">{item.text}</p>}
              </div>
              {(i < items.length - 1 || spec.tipo === "ciclo") && (
                <ArrowRight className="size-4 shrink-0 text-sun-deep" aria-hidden />
              )}
            </div>
          ))}
          {spec.tipo === "ciclo" && (
            <div className="grid place-items-center rounded-lg border border-dashed border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
              volta ao início
            </div>
          )}
        </div>
      </Figure>
    );
  }

  // etapas e linha do tempo
  return (
    <Figure title={spec.titulo} caption={spec.legenda}>
      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-sun font-mono text-[11px] font-semibold text-ink">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 border-l border-dashed border-line pl-3">
              <span className="block text-sm font-semibold text-ink">{item.title}</span>
              {item.text && <span className="mt-0.5 block text-sm text-ink-soft">{item.text}</span>}
            </span>
          </li>
        ))}
      </ol>
    </Figure>
  );
}

/**
 * Renderiza os blocos de ilustração (```grafico / ```esquema) que a IA escreve
 * nos resumos e planos. Se o conteúdo não for válido, mostra o texto original.
 */
export function DiagramBlock({ source }: { source: string }) {
  let spec: Spec | null = null;
  try {
    spec = JSON.parse(source) as Spec;
  } catch {
    spec = null;
  }
  if (!spec || typeof spec !== "object" || !("tipo" in spec)) {
    return (
      <pre className="my-3 overflow-x-auto rounded-lg border border-line bg-paper p-3 text-xs text-ink-soft">
        {source}
      </pre>
    );
  }
  return isChart(spec) ? <ChartFigure spec={spec} /> : <SchemeFigure spec={spec as SchemeSpec} />;
}

/** Detecta se um bloco de código é uma ilustração. */
export function isDiagramLanguage(lang?: string | null): boolean {
  if (!lang) return false;
  return ["grafico", "gráfico", "chart", "esquema", "diagrama", "ilustracao", "ilustração"].includes(
    lang.toLowerCase(),
  );
}
