import { MathJax } from "better-react-mathjax"
import React from "react"

export default function displayLatexResult(props: { latex: string}) {
  
  return (
    <div className="grid w-full gap-2 min-h-60 pb-3 min-w-60">
        <MathJax>
            {props.latex}
        </MathJax>
    </div>
  )
}