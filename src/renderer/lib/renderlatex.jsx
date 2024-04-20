import React, { useEffect } from 'react';

function renderLatex(latexString) {
  useEffect(() => {
    const loadMathJax = () => {
      if (window.MathJax) {
        window.MathJax.typeset();
      } else {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => {
          window.MathJax = {
            tex: {
              inlineMath: [['$', '$'], ['\\(', '\\)']]
            },
            svg: {
              fontCache: 'global'
            },
            startup: {
              typeset: true,
            }
          };
          window.MathJax.typesetPromise().then(() => {
            console.log("MathJax initial typesetting complete");
          }).catch((err) => console.error('Typesetting failed: ', err));
        };
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
        document.head.appendChild(script);
      }
    };

    loadMathJax();
  }, [latexString]);

  return (
    <span dangerouslySetInnerHTML={{ __html: `\\(${latexString}\\)` }} />
  );
}

export default renderLatex;
