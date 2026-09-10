import { useEffect, useRef } from "react";
import { animate, stagger, type AnimationParams } from "animejs";

/** Respeita a preferência do sistema por menos movimento. */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Anima os elementos que casam com `selector` dentro do container quando ele
 * entra na tela. Retorna a ref para ser aplicada no elemento pai.
 */
export function useRevealOnView<T extends HTMLElement = HTMLDivElement>(options?: {
  selector?: string;
  y?: number;
  delayStep?: number;
  duration?: number;
  once?: boolean;
}) {
  const ref = useRef<T | null>(null);
  const {
    selector = "[data-reveal]",
    y = 14,
    delayStep = 70,
    duration = 620,
    once = true,
  } = options ?? {};

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    const items = targets.length ? targets : [root];

    if (prefersReducedMotion()) {
      items.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    items.forEach((el) => {
      el.style.opacity = "0";
    });

    const run = () => {
      animate(items, {
        opacity: [0, 1],
        translateY: [y, 0],
        duration,
        delay: stagger(delayStep),
        ease: "outCubic",
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run();
          if (once) observer.disconnect();
        });
      },
      { threshold: 0.12 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [selector, y, delayStep, duration, once]);

  return ref;
}

/** Animação pontual e imperativa (ex.: acerto, conquista, envio). */
export function pop(target: Element | Element[] | string, params?: AnimationParams) {
  if (prefersReducedMotion()) return;
  animate(target, {
    scale: [1, 1.08, 1],
    duration: 460,
    ease: "outBack",
    ...params,
  });
}

/** Chacoalhada curta para erros de validação. */
export function shake(target: Element | Element[] | string) {
  if (prefersReducedMotion()) return;
  animate(target, {
    translateX: [0, -8, 7, -4, 0],
    duration: 380,
    ease: "outQuad",
  });
}

/** Contagem animada de números (progresso, pontuação). */
export function countUp(
  el: HTMLElement,
  to: number,
  options?: { from?: number; duration?: number; suffix?: string },
) {
  const { from = 0, duration = 900, suffix = "" } = options ?? {};
  if (prefersReducedMotion()) {
    el.textContent = `${to}${suffix}`;
    return;
  }
  const state = { v: from };
  animate(state, {
    v: to,
    duration,
    ease: "outCubic",
    onUpdate: () => {
      el.textContent = `${Math.round(state.v)}${suffix}`;
    },
  });
}
