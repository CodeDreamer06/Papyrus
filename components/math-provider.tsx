"use client";

import type { ReactNode } from "react";
import { MathJaxContext } from "better-react-mathjax";

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
  },
  chtml: {
    scale: 1.05,
  },
};

interface MathProviderProps {
  children: ReactNode;
}

export function MathProvider({ children }: MathProviderProps) {
  return <MathJaxContext config={mathJaxConfig}>{children}</MathJaxContext>;
}
