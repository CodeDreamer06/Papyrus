"use client";

import { MathJax } from "better-react-mathjax";

interface MathTextProps {
  text: string;
  className?: string;
}

export function MathText({ text, className }: MathTextProps) {
  return (
    <span className={className}>
      <MathJax dynamic hideUntilTypeset="every" inline={false}>
        {text}
      </MathJax>
    </span>
  );
}
