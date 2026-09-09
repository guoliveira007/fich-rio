import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { DiagramBlock, isDiagramLanguage } from "@/components/DiagramBlock";



type CodeProps = { className?: string | undefined; children?: React.ReactNode };

function renderCode({ className, children }: CodeProps) {
  const lang = /language-([\w\u00C0-\u017F]+)/.exec(className ?? "")?.[1];
  const source = String(Array.isArray(children) ? children.join("") : (children ?? ""));
  if (isDiagramLanguage(lang)) return <DiagramBlock source={source} />;
  return <span className="font-mono">{children}</span>;
}

/** Pares clássicos de texto UTF-8 lido como latin-1 (mojibake). */
const MOJIBAKE: Array<[RegExp, string]> = [
  [/â€œ|â€\u009c/g, "“"],
  [/â€\u009d|â€/g, "”"],
  [/â€™/g, "’"],
  [/â€˜/g, "‘"],
  [/â€“/g, "–"],
  [/â€”/g, "—"],
  [/â€¦/g, "…"],
  [/â€¢/g, "•"],
  [/Ã¡/g, "á"], [/Ã /g, "à"], [/Ã¢/g, "â"], [/Ã£/g, "ã"], [/Ã¤/g, "ä"],
  [/Ã©/g, "é"], [/Ãª/g, "ê"], [/Ã¨/g, "è"],
  [/Ã­/g, "í"], [/Ã®/g, "î"],
  [/Ã³/g, "ó"], [/Ã´/g, "ô"], [/Ãµ/g, "õ"], [/Ã²/g, "ò"], [/Ã¶/g, "ö"],
  [/Ãº/g, "ú"], [/Ã¹/g, "ù"], [/Ã¼/g, "ü"],
  [/Ã§/g, "ç"], [/Ã±/g, "ñ"],
  [/Ã\u0081/g, "Á"], [/Ã‰/g, "É"], [/Ã\u008d/g, "Í"], [/Ã“/g, "Ó"], [/Ãš/g, "Ú"],
  [/Ã‡/g, "Ç"], [/Ãƒ/g, "Ã"], [/Ã•/g, "Õ"], [/Ã‚/g, "Â"], [/ÃŠ/g, "Ê"], [/Ã”/g, "Ô"],
  [/Â°/g, "°"], [/Âº/g, "º"], [/Âª/g, "ª"], [/Â§/g, "§"], [/Â±/g, "±"],
  [/Â(?=[\s\p{P}\d])/gu, ""],
];

const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵",
  "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", n: "ⁿ",
};
const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅",
  "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋",
};

const TEX_SYMBOLS: Array<[RegExp, string]> = [
  [/\\times/g, "×"], [/\\div/g, "÷"], [/\\cdot/g, "·"],
  [/\\pm/g, "±"], [/\\mp/g, "∓"],
  [/\\leq?\b/g, "≤"], [/\\geq?\b/g, "≥"], [/\\neq/g, "≠"], [/\\approx/g, "≈"],
  [/\\infty/g, "∞"], [/\\rightarrow|\\to\b/g, "→"], [/\\leftarrow/g, "←"],
  [/\\Delta/g, "Δ"], [/\\delta/g, "δ"], [/\\alpha/g, "α"], [/\\beta/g, "β"],
  [/\\gamma/g, "γ"], [/\\theta/g, "θ"], [/\\lambda/g, "λ"], [/\\mu/g, "μ"],
  [/\\pi/g, "π"], [/\\sigma/g, "σ"], [/\\omega/g, "ω"], [/\\Omega/g, "Ω"],
  [/\\degree|\\circ/g, "°"], [/\\%/g, "%"],
];

/** Converte notação LaTeX simples em símbolos legíveis. */
function detex(input: string): string {
  let text = input;
  text = text.replace(/\\sqrt\{([^{}]*)\}/g, "√($1)");
  text = text.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  text = text.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  for (const [re, ch] of TEX_SYMBOLS) text = text.replace(re, ch);
  text = text.replace(/\\text\{([^{}]*)\}/g, "$1");
  text = text.replace(/\\mathrm\{([^{}]*)\}/g, "$1");
  text = text.replace(/\\left|\\right/g, "");
  // expoentes e índices: x^2, H_2O, x^{10}
  text = text.replace(/\^\{?([0-9+\-n]{1,3})\}?/g, (m, g: string) =>
    [...g].every((c) => c in SUP) ? [...g].map((c) => SUP[c]).join("") : m,
  );
  text = text.replace(/(?<=[A-Za-z0-9)\]])_\{?([0-9+\-]{1,3})\}?/g, (m, g: string) =>
    [...g].every((c) => c in SUB) ? [...g].map((c) => SUB[c]).join("") : m,
  );
  // delimitadores de fórmula que sobraram
  text = text.replace(/\\[()[\]]/g, "");
  text = text.replace(/\$\$?/g, "");
  return text;
}

/** Comandos LaTeX que valem a pena renderizar de verdade (frações, raízes, etc.). */
const MATH_COMMANDS =
  /\\(?:d?frac|tfrac|sqrt|sum|prod|int|lim|binom|overline|vec|hat|bar|matrix|begin|log|sin|cos|tan|ln|pm|leq|geq|neq|approx|times|div|cdot|infty|to|rightarrow|alpha|beta|gamma|delta|Delta|theta|lambda|mu|pi|sigma|omega|Omega)\b/;

/** Extrai trechos matemáticos ($...$, $$...$$, \(...\), \[...\]) e os normaliza para $. */
function extractMath(input: string): { text: string; math: string[] } {
  const math: string[] = [];
  const push = (body: string, display: boolean) => {
    const idx = math.push(display ? `$$${body}$$` : `$${body}$`) - 1;
    return `\u0000MATH${idx}\u0000`;
  };
  let text = input;
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, b: string) => push(b.trim(), true));
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_m, b: string) => push(b.trim(), true));
  text = text.replace(/\$([^$\n]+?)\$/g, (_m, b: string) => push(b.trim(), false));
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_m, b: string) => push(b.trim(), false));
  // grupos \left( ... \right) sem delimitador de fórmula
  text = text.replace(
    /\\left\s*([([{|.])([\s\S]*?)\\right\s*([)\]}|.])/g,
    (_m, open: string, body: string, close: string) =>
      push(`\\left${open}${body}\\right${close}`, false),
  );
  // fórmulas soltas, sem delimitador: \frac{1}{2}, \sqrt{5}, \times ...

  text = text.replace(
    /(?:\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\]]*\]|\^\{?[^\s{}]+\}?|_\{?[^\s{}]+\}?)*[ ]?)+/g,
    (m) => {
      if (!MATH_COMMANDS.test(m)) return m;
      const trailing = /\s$/.test(m) ? " " : "";
      return push(m.trim(), false) + trailing;
    },
  );

  return { text, math };
}

function restoreMath(text: string, math: string[]): string {
  return text.replace(/\u0000MATH(\d+)\u0000/g, (_m, i: string) => math[Number(i)] ?? "");
}

/** Correções de caracteres quebrados, sem tocar em fórmulas. */
function cleanPlain(input: string): string {
  let text = input.normalize("NFC");
  for (const [re, ch] of MOJIBAKE) text = text.replace(re, ch);
  text = text.replace(/\(cid:\d+\)/g, "");
  text = text.replace(/[\uFFFD\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  text = text.replace(/\u00AD/g, "");
  text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  text = text.replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)));
  return text;
}

/**
 * Limpa caracteres quebrados e notação técnica antes de exibir qualquer texto.
 * Com `keepMath`, as fórmulas ficam preservadas em `$...$` para serem renderizadas.
 */
export function cleanText(input?: string | null, opts?: { keepMath?: boolean }): string {
  if (!input) return "";
  if (opts?.keepMath) {
    const { text, math } = extractMath(input);
    const cleaned = cleanPlain(text).replace(/[ \t]{2,}/g, " ");
    return restoreMath(cleaned, math).trim();
  }
  let text = cleanPlain(input);
  text = detex(text);
  text = text.replace(/[ \t]{2,}/g, " ");
  return text.trim();
}

/**
 * Texto vindo da IA ou de PDFs: corrige caracteres quebrados, mostra
 * negrito/itálico/listas e renderiza fórmulas (frações, raízes, expoentes).
 */
export function RichText({
  children,
  className,
}: {
  children?: string | null;
  className?: string;
}) {
  const text = cleanText(children, { keepMath: true });
  if (!text) return null;
  return (
    <div className={`rich-text ${className ?? ""}`}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, output: "html" }]]}
        components={{
          p: ({ children: c }) => <p className="whitespace-pre-line">{c}</p>,
          ul: ({ children: c }) => <ul className="list-disc space-y-1 pl-5">{c}</ul>,
          ol: ({ children: c }) => <ol className="list-decimal space-y-1 pl-5">{c}</ol>,
          strong: ({ children: c }) => <strong className="font-semibold text-ink">{c}</strong>,
          h1: ({ children: c }) => <p className="font-display font-semibold text-ink">{c}</p>,
          h2: ({ children: c }) => <p className="font-display font-semibold text-ink">{c}</p>,
          h3: ({ children: c }) => <p className="font-display font-semibold text-ink">{c}</p>,
          pre: ({ children: c }) => <>{c}</>,
          code: (props) => renderCode(props as CodeProps),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}

