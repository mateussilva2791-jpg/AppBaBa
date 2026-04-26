"use client";

import type { ReactNode } from "react";

import { useInView } from "@/hooks/useInView";


type RevealVariant = "up" | "left" | "right" | "scale";

type RevealProps = {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: 0 | 100 | 200 | 300 | 400 | 500 | 600 | 700;
  className?: string;
};

const variantClass: Record<RevealVariant, string> = {
  up: "reveal",
  left: "reveal-left",
  right: "reveal-right",
  scale: "reveal-scale",
};

export function Reveal({ children, variant = "up", delay = 0, className = "" }: RevealProps) {
  const { ref, inView } = useInView();
  const delayClass = delay ? `delay-${delay}` : "";
  const cls = [variantClass[variant], inView ? "visible" : "", delayClass, className].filter(Boolean).join(" ");

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={cls}>
      {children}
    </div>
  );
}
