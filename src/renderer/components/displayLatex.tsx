import { MathJax } from "better-react-mathjax"
import React, { useEffect } from "react"

declare global {
  interface Window {
    MathJax: any;
  }
}
export default function displayLatexResult(props: { latex: string}) {
  //rerender the latex result when props.latex is changed
  useEffect(() => {
    const typesetPromise = window.MathJax?.typesetPromise;
    if (typeof typesetPromise === "function") {
      void typesetPromise.call(window.MathJax).catch((error: unknown) => {
        console.error("Failed to typeset LaTeX:", error);
      });
    }
  }, [props.latex]);
  return (
    <div className="grid w-full gap-2 pb-3 min-w-60">
        <MathJax>
            {props.latex}
        </MathJax>
    </div>
  )
}
