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
    // Assuming MathJax object is available globally
    if (window.MathJax) {
      window.MathJax.typesetPromise();
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