import React from 'react';
import renderLatex from '../lib/renderlatex';

export default function Renderlatex() {
    return (
        <div>
            {renderLatex('\\frac{1}{2}')}
        </div>
    )
}