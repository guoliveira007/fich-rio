import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useRevealOnView } from "@/lib/anime";

/**
 * Envolve um bloco e revela seus filhos marcados com `data-reveal`
 * (ou o próprio bloco) em cascata quando entram na tela.
 */
export function Reveal({
  children,
  className,
  y,
  delayStep,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delayStep?: number;
}) {
  const ref = useRevealOnView<HTMLDivElement>({
    ...(y === undefined ? {} : { y }),
    ...(delayStep === undefined ? {} : { delayStep }),
  });
  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
