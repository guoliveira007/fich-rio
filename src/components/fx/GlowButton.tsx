import * as React from "react";

import { cn } from "@/lib/utils";
import { pop } from "@/lib/anime";

/**
 * Botão de destaque inspirado nos padrões do Uiverse, reescrito com os
 * tokens do fichário (sol / papel) para funcionar com o tema do app.
 */
export const GlowButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, children, ...props }, ref) => (
  <button
    ref={ref}
    onClick={(event) => {
      pop(event.currentTarget);
      onClick?.(event);
    }}
    className={cn("uv-glow-button", className)}
    {...props}
  >
    <span className="uv-glow-button__label">{children}</span>
  </button>
));
GlowButton.displayName = "GlowButton";
