import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Cartão com borda em gradiente e brilho que atravessa no hover
 * (padrão Uiverse adaptado aos tokens do fichário).
 */
export function ShineCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("uv-shine-card", className)}>
      <div className="uv-shine-card__inner">{children}</div>
    </div>
  );
}
