
import React, { useEffect } from 'react';

function renderLatex(latexString) {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.MathJax !== 'undefined') {
      window.MathJax.typeset();
    } else {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => {
        window.MathJax.typeset();
      };
      script.src = 'https://polyfill.io/v3/polyfill.min.js?features=es6';
      document.head.appendChild(script);

      const config = document.createElement('script');
      config.type = 'text/x-mathjax-config';
      config.text = `
        MathJax.Hub.Config({
          tex2jax: {inlineMath: [['$', '$'], ['\\\\(', '\\\\)']]}
        });
      `;
      document.head.appendChild(config);
    }
  }, [latexString]);

  return (
    <span dangerouslySetInnerHTML={{ __html: `\\(${latexString}\\)` }} />
  );
}

export default renderLatex;
