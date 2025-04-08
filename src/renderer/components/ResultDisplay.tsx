import React from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import LoadingSkeleton from './loadingSkeleton';
import DisplayLatex from './displayLatex';
import DisplayTextResult from './DisplayTextResult';

interface ResultDisplayProps {
  loading: boolean;
  result: string | null;
  prompt: string;
  handleTextChange: (text: string) => void;
  isStickyMode?: boolean;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  loading, 
  result, 
  prompt, 
  handleTextChange,
  isStickyMode
}) => (
  <>
    {loading && <LoadingSkeleton />}
    
    <MathJaxContext version={3} config={{
      loader: { load: ["[tex]/html"] },
      tex: {
        packages: { "[+]": ["html"] },
        inlineMath: [
          ["$", "$"],
          ["\\(", "\\)"]
        ],
        displayMath: [
          ["$$", "$$"],
          ["\\[", "\\]"],
          ["```latex", "```"],
        ]
      }
    }}>
      {(result && prompt === "Formula") && <DisplayLatex latex={result} />}
    </MathJaxContext>
    
    {result && <DisplayTextResult text={result} onTextChange={handleTextChange} isStickyMode={isStickyMode} />}
  </>
);

export default ResultDisplay; 