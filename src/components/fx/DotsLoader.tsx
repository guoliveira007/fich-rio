import { cn } from "@/lib/utils";

/** Indicador de carregamento em três pontos (padrão Uiverse, tokens do app). */
export function DotsLoader({
  className,
  label = "Carregando",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span className={cn("uv-dots", className)} role="status" aria-label={label}>
      <span />
      <span />
      <span />
    </span>
  );
}
