/**
 * Converts LaTeX math expressions and Markdown into clean, readable Unicode math text.
 * Suitable for pasting into Telegram, Messenger, Word, Notes, etc. without raw LaTeX markup.
 */
export function latexToPlainText(latexStr) {
  if (!latexStr) return '';
  let str = String(latexStr);

  // Remove $$ and $ math delimiters
  str = str.replace(/\$\$/g, '\n').replace(/\$/g, '');

  // Remove LaTeX environments
  str = str.replace(/\\begin\{[a-zA-Z*]+\}/g, '').replace(/\\end\{[a-zA-Z*]+\}/g, '');

  // Invisible delimiters
  str = str.replace(/\\left\./g, '').replace(/\\right\./g, '');
  str = str.replace(/\\left/g, '').replace(/\\right/g, '');

  // Greek letters
  const greek = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η',
    theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ',
    pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ',
    psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ',
    Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω'
  };
  for (const [key, val] of Object.entries(greek)) {
    str = str.replace(new RegExp(`\\\\${key}\\b`, 'g'), val);
  }

  // Common math symbols & operators
  str = str.replace(/\\to\b|\\rightarrow\b/g, ' → ')
           .replace(/\\leftarrow\b/g, ' ← ')
           .replace(/\\leftrightarrow\b/g, ' ↔ ')
           .replace(/\\Rightarrow\b/g, ' ⇒ ')
           .replace(/\\Leftarrow\b/g, ' ⇐ ')
           .replace(/\\Leftrightarrow\b/g, ' ⇔ ')
           .replace(/\\infty\b/g, '∞')
           .replace(/\\cdot\b/g, ' · ')
           .replace(/\\times\b/g, ' × ')
           .replace(/\\div\b/g, ' ÷ ')
           .replace(/\\pm\b/g, ' ± ')
           .replace(/\\mp\b/g, ' ∓ ')
           .replace(/\\le\b|\\leq\b/g, ' ≤ ')
           .replace(/\\ge\b|\\geq\b/g, ' ≥ ')
           .replace(/\\ne\b|\\neq\b/g, ' ≠ ')
           .replace(/\\approx\b/g, ' ≈ ')
           .replace(/\\equiv\b/g, ' ≡ ')
           .replace(/\\in\b/g, ' ∈ ')
           .replace(/\\notin\b/g, ' ∉ ')
           .replace(/\\subset\b/g, ' ⊂ ')
           .replace(/\\subseteq\b/g, ' ⊆ ')
           .replace(/\\cup\b/g, ' ∪ ')
           .replace(/\\cap\b/g, ' ∩ ')
           .replace(/\\forall\b/g, '∀')
           .replace(/\\exists\b/g, '∃')
           .replace(/\\partial\b/g, '∂')
           .replace(/\\nabla\b/g, '∇')
           .replace(/\\int\b/g, '∫')
           .replace(/\\sum\b/g, '∑')
           .replace(/\\prod\b/g, '∏');

  // Limits
  str = str.replace(/\\lim_\{([^}]+)\}/g, 'lim($1) ');
  str = str.replace(/\\lim\b/g, 'lim ');

  // Spacing commands
  str = str.replace(/\\quad\b/g, '  ')
           .replace(/\\qquad\b/g, '    ')
           .replace(/\\,|\\;|\\:|\\!/g, ' ');

  // Text inside math
  str = str.replace(/\\(?:text|mathrm|mathbf|mathit)\{([^{}]+)\}/g, '$1');

  // Superscripts (Unicode numbers & chars)
  const superMap = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ'
  };
  str = str.replace(/\^\{([0-9+\-nixy=()]+)\}/g, (m, p1) => {
    return p1.split('').map(c => superMap[c] || c).join('');
  });
  str = str.replace(/\^([0-9+\-nixy])/g, (m, c) => superMap[c] || `^${c}`);
  str = str.replace(/\^\{([^}]+)\}/g, '^($1)');

  // Subscripts (Unicode numbers & chars)
  const subMap = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'n': 'ₙ', 'm': 'ₘ'
  };
  str = str.replace(/_\{([0-9+\-aeoxijknm=()]+)\}/g, (m, p1) => {
    return p1.split('').map(c => subMap[c] || c).join('');
  });
  str = str.replace(/_([0-9+\-aeoxijknm])/g, (m, c) => subMap[c] || `_${c}`);
  str = str.replace(/_\{([^}]+)\}/g, '_($1)');

  // Fractions recursively
  let fracRegex = /\\frac\{([^{}]+)\}\{([^{}]+)\}/;
  while (fracRegex.test(str)) {
    str = str.replace(fracRegex, (m, num, den) => {
      num = num.trim();
      den = den.trim();
      if (/^[a-zA-Z0-9⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+$/.test(num) && /^[a-zA-Z0-9⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+$/.test(den)) {
        return `${num}/${den}`;
      }
      return `(${num})/(${den})`;
    });
  }

  // Square root & nth root
  let sqrtNRegex = /\\sqrt\[([^\]]+)\]\{([^{}]+)\}/;
  while (sqrtNRegex.test(str)) {
    str = str.replace(sqrtNRegex, 'ⁿ√($2)');
  }
  let sqrtRegex = /\\sqrt\{([^{}]+)\}/;
  while (sqrtRegex.test(str)) {
    str = str.replace(sqrtRegex, (m, inner) => {
      inner = inner.trim();
      if (/^[a-zA-Z0-9]+$/.test(inner)) return `√${inner}`;
      return `√(${inner})`;
    });
  }

  // LaTeX alignment & line breaks
  str = str.replace(/&=\s*/g, '= ')
           .replace(/&/g, ' ')
           .replace(/\\\\/g, '\n')
           .replace(/\\\s*\n/g, '\n');

  // Remove any remaining raw backslashes
  str = str.replace(/\\([a-zA-Z]+)/g, '$1');

  // Clean Markdown formatting (bold, italics, headers) for clean plain copy
  str = str.replace(/###?\s*/g, '')
           .replace(/\*\*([^*]+)\*\*/g, '$1')
           .replace(/\*([^*]+)\*/g, '$1');

  // Clean double spaces & lines
  str = str.split('\n')
           .map(line => line.replace(/[ \t]+/g, ' ').trim())
           .filter(line => line.length > 0)
           .join('\n');

  return str.trim();
}
