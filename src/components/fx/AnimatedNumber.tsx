import { useEffect, useRef } from "react";

import { countUp } from "@/lib/anime";

/** Número que sobe animado até o valor final (anime.js). */
export function AnimatedNumber({
  value,
  className,
  suffix,
}: {
  value: number;
  className?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const previous = useRef(0);

  useEffect(() => {
    if (!ref.current) return;
    countUp(ref.current, value, { from: previous.current, suffix: suffix ?? "" });
    previous.current = value;
  }, [value, suffix]);

  return (
    <span ref={ref} className={className}>
      0
      {suffix ?? ""}
    </span>
  );
}
