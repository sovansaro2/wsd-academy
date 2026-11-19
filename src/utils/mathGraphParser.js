/**
 * Safe recursive-descent math expression parser, implicit/inequality compiler,
 * and numerical calculus analyzer for WSD Academy Graphing Lab (100% offline).
 */

const FUNCTIONS = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  cot: (x) => {
    const t = Math.tan(x);
    return Math.abs(t) < 1e-12 ? NaN : 1 / t;
  },
  sec: (x) => {
    const c = Math.cos(x);
    return Math.abs(c) < 1e-12 ? NaN : 1 / c;
  },
  csc: (x) => {
    const s = Math.sin(x);
    return Math.abs(s) < 1e-12 ? NaN : 1 / s;
  },
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  sqrt: (x) => (x < 0 ? NaN : Math.sqrt(x)),
  cbrt: (x) => Math.cbrt(x),
  abs: (x) => Math.abs(x),
  ln: (x) => (x <= 0 ? NaN : Math.log(x)),
  log: (x) => (x <= 0 ? NaN : Math.log10(x)),
  log2: (x) => (x <= 0 ? NaN : Math.log2(x)),
  exp: (x) => Math.exp(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  round: (x) => Math.round(x),
  sign: (x) => Math.sign(x),
};

const KNOWN_MULTI_IDENTIFIERS = new Set([
  ...Object.keys(FUNCTIONS),
  'pi',
]);

function normalizeMathChars(raw) {
  if (typeof raw !== 'string') return '';
  let expr = raw.trim();
  expr = expr
    .replace(/−|–|—/g, '-')
    .replace(/×|·/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([a-zA-Z0-9_.]+)/g, 'sqrt($1)')
    .replace(/∛\s*\(/g, 'cbrt(')
    .replace(/∛\s*([a-zA-Z0-9_.]+)/g, 'cbrt($1)');

  let guard = 0;
  while (expr.includes('|') && guard < 12) {
    const replaced = expr.replace(/\|([^|]+)\|/g, 'abs($1)');
    if (replaced === expr) break;
    expr = replaced;
    guard += 1;
  }
  return expr.trim();
}

export function normalizeExpressionInput(raw) {
  let expr = normalizeMathChars(raw);
  expr = expr.replace(/^(?:[a-zA-Z]\s*\(\s*x\s*\)|y)\s*=\s*/i, '');
  return expr.trim();
}

function tokenize(input) {
  const tokens = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < len && /[0-9]/.test(input[i + 1]))) {
      let numStr = '';
      let dotCount = 0;
      while (i < len && (/[0-9]/.test(input[i]) || (input[i] === '.' && dotCount === 0))) {
        if (input[i] === '.') dotCount += 1;
        numStr += input[i];
        i += 1;
      }
      const value = Number(numStr);
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number: ${numStr}`);
      }
      tokens.push({ type: 'number', value });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < len && /[a-zA-Z0-9_]/.test(input[i])) {
        ident += input[i];
        i += 1;
      }
      const lower = ident.toLowerCase();

      if (KNOWN_MULTI_IDENTIFIERS.has(lower)) {
        if (lower === 'pi') {
          tokens.push({ type: 'number', value: Math.PI });
        } else {
          tokens.push({ type: 'func', value: lower });
        }
        continue;
      }

      let cursor = 0;
      while (cursor < lower.length) {
        const rest = lower.slice(cursor);
        let matchedFunc = null;
        for (const fnName of KNOWN_MULTI_IDENTIFIERS) {
          if (rest.startsWith(fnName)) {
            if (!matchedFunc || fnName.length > matchedFunc.length) {
              matchedFunc = fnName;
            }
          }
        }
        if (matchedFunc && (cursor + matchedFunc.length === lower.length || input[i] === '(')) {
          if (matchedFunc === 'pi') {
            tokens.push({ type: 'number', value: Math.PI });
          } else {
            tokens.push({ type: 'func', value: matchedFunc });
          }
          cursor += matchedFunc.length;
        } else {
          const single = lower[cursor];
          if (single === 'e') {
            tokens.push({ type: 'number', value: Math.E });
          } else if (
            single === 'x' ||
            single === 'y' ||
            single === 'a' ||
            single === 'b' ||
            single === 'c'
          ) {
            tokens.push({ type: 'var', value: single });
          } else {
            throw new Error(`Unknown symbol: ${ident}`);
          }
          cursor += 1;
        }
      }
      continue;
    }

    if ('+-*/^'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      i += 1;
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i += 1;
      continue;
    }

    throw new Error(`Unexpected character: ${ch}`);
  }

  const withImplicit = [];
  for (let k = 0; k < tokens.length; k += 1) {
    const cur = tokens[k];
    withImplicit.push(cur);
    const next = tokens[k + 1];
    if (!next) continue;

    const leftEndsValue =
      cur.type === 'number' || cur.type === 'var' || cur.type === 'rparen';
    const rightStartsValue =
      next.type === 'number' ||
      next.type === 'var' ||
      next.type === 'func' ||
      next.type === 'lparen';

    if (leftEndsValue && rightStartsValue) {
      withImplicit.push({ type: 'op', value: '*' });
    }
  }

  return withImplicit;
}

function buildAst(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => {
    const t = tokens[pos];
    pos += 1;
    return t;
  };

  function parseExpression() {
    let node = parseTerm();
    while (peek()?.type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseTerm();
      node = { kind: 'bin', op, left: node, right };
    }
    return node;
  }

  function parseTerm() {
    let node = parseUnary();
    while (peek()?.type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = consume().value;
      const right = parseUnary();
      node = { kind: 'bin', op, left: node, right };
    }
    return node;
  }

  function parseUnary() {
    if (peek()?.type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const arg = parseUnary();
      return op === '-' ? { kind: 'neg', arg } : arg;
    }
    return parsePower();
  }

  function parsePower() {
    const base = parsePrimary();
    if (peek()?.type === 'op' && peek().value === '^') {
      consume();
      const exp = parseUnary();
      return { kind: 'bin', op: '^', left: base, right: exp };
    }
    return base;
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) {
      throw new Error('Incomplete expression');
    }

    if (tok.type === 'number') {
      consume();
      return { kind: 'num', value: tok.value };
    }

    if (tok.type === 'var') {
      consume();
      return { kind: 'var', name: tok.value };
    }

    if (tok.type === 'func') {
      const fnName = consume().value;
      if (peek()?.type === 'lparen') {
        consume();
        const arg = parseExpression();
        if (peek()?.type !== 'rparen') {
          throw new Error(`Missing closing ")" after ${fnName}(...)`);
        }
        consume();
        return { kind: 'call', name: fnName, arg };
      }
      const arg = parseUnary();
      return { kind: 'call', name: fnName, arg };
    }

    if (tok.type === 'lparen') {
      consume();
      const inner = parseExpression();
      if (peek()?.type !== 'rparen') {
        throw new Error('Missing closing ")"');
      }
      consume();
      return inner;
    }

    throw new Error(`Unexpected token: ${tok.value}`);
  }

  const ast = parseExpression();
  if (pos < tokens.length) {
    throw new Error(`Unexpected token: ${tokens[pos].value}`);
  }
  return ast;
}

function evalAst(node, vars) {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'var':
      return vars[node.name] ?? 0;
    case 'neg':
      return -evalAst(node.arg, vars);
    case 'call': {
      const val = evalAst(node.arg, vars);
      if (!Number.isFinite(val)) return NaN;
      const fn = FUNCTIONS[node.name];
      if (!fn) return NaN;
      const res = fn(val);
      return Number.isFinite(res) ? res : NaN;
    }
    case 'bin': {
      const l = evalAst(node.left, vars);
      const r = evalAst(node.right, vars);
      if (!Number.isFinite(l) || !Number.isFinite(r)) return NaN;
      switch (node.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return Math.abs(r) < 1e-12 ? NaN : l / r;
        case '^': {
          const res = Math.pow(l, r);
          return Number.isFinite(res) ? res : NaN;
        }
        default:
          return NaN;
      }
    }
    default:
      return NaN;
  }
}

function collectVars(node, set = new Set()) {
  if (!node) return set;
  if (node.kind === 'var') {
    set.add(node.name);
  } else if (node.kind === 'neg' || node.kind === 'call') {
    collectVars(node.arg, set);
  } else if (node.kind === 'bin') {
    collectVars(node.left, set);
    collectVars(node.right, set);
  }
  return set;
}

function compileRawAst(exprStr) {
  const tokens = tokenize(exprStr);
  if (tokens.length === 0) throw new Error('empty');
  const ast = buildAst(tokens);
  const varsUsed = collectVars(ast);
  const usedParams = ['a', 'b', 'c'].filter((p) => varsUsed.has(p));
  return { ast, varsUsed, usedParams };
}

/**
 * Compile an explicit single-variable expression `f(x)` cleanly.
 */
export function compileMathExpression(raw) {
  const normalized = normalizeExpressionInput(raw);
  if (!normalized) {
    return { ok: false, error: 'empty', evaluate: () => NaN, usedParams: [] };
  }
  try {
    const { ast, varsUsed, usedParams } = compileRawAst(normalized);
    if (varsUsed.has('y')) {
      throw new Error('Contains y');
    }
    const evaluate = (x, params = {}) =>
      evalAst(ast, {
        x,
        y: 0,
        a: Number(params.a ?? 1),
        b: Number(params.b ?? 0),
        c: Number(params.c ?? 0),
      });
    evaluate(1, { a: 1, b: 0, c: 0 });
    return { ok: true, evaluate, usedParams, normalized };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Syntax error',
      evaluate: () => NaN,
      usedParams: [],
    };
  }
}

/**
 * Smart multi-form compiler supporting:
 * - function: y = f(x), f(x) = ..., or expression in x
 * - vertical: x = const/param (e.g. x = 2, x = a)
 * - inequality: y < f(x), y <= f(x), y > f(x), y >= f(x)
 * - implicit: F(x, y) = 0 (circles, ellipses, hyperbolas, x = y^2)
 * - implicitInequality: F(x, y) < / <= / > / >= 0 (e.g. x^2 + y^2 <= 9)
 */
export function compileGraphEntry(raw) {
  const clean = normalizeMathChars(raw);
  if (!clean) {
    return { ok: false, kind: 'function', error: 'empty', evaluate: () => NaN, usedParams: [] };
  }

  try {
    // Detect comparison operator (<=, >=, <, >, =)
    const relMatch = clean.match(/^(.*?)(<=|>=|<|>|=)(.*)$/);
    if (!relMatch) {
      // Bare expression without '=' -> y = expr
      const fnRes = compileMathExpression(clean);
      return {
        ...fnRes,
        kind: 'function',
      };
    }

    const lhsRaw = relMatch[1].trim();
    const op = relMatch[2];
    const rhsRaw = relMatch[3].trim();
    if (!lhsRaw || !rhsRaw) {
      throw new Error('Incomplete equation');
    }

    // 1. Standard function or y inequality: LHS is y or f(x)/g(x)
    if (/^(?:[a-zA-Z]\s*\(\s*x\s*\)|y)$/i.test(lhsRaw)) {
      const rhsCompiled = compileRawAst(rhsRaw);
      if (rhsCompiled.varsUsed.has('y')) {
        // y appears on RHS too (e.g. y = y^2 + x) -> treat as implicit
      } else {
        const evaluate = (x, params = {}) =>
          evalAst(rhsCompiled.ast, {
            x,
            y: 0,
            a: Number(params.a ?? 1),
            b: Number(params.b ?? 0),
            c: Number(params.c ?? 0),
          });
        evaluate(1, { a: 1, b: 0, c: 0 });
        if (op === '=') {
          return {
            ok: true,
            kind: 'function',
            evaluate,
            usedParams: rhsCompiled.usedParams,
            normalized: rhsRaw,
          };
        }
        return {
          ok: true,
          kind: 'inequality',
          op,
          strict: op === '<' || op === '>',
          evaluate,
          usedParams: rhsCompiled.usedParams,
          normalized: rhsRaw,
        };
      }
    }

    // 2. Vertical line: x = constant/params (no x or y on RHS)
    if (/^x$/i.test(lhsRaw) && op === '=') {
      const rhsCompiled = compileRawAst(rhsRaw);
      if (!rhsCompiled.varsUsed.has('x') && !rhsCompiled.varsUsed.has('y')) {
        const evalX = (params = {}) =>
          evalAst(rhsCompiled.ast, {
            x: 0,
            y: 0,
            a: Number(params.a ?? 1),
            b: Number(params.b ?? 0),
            c: Number(params.c ?? 0),
          });
        evalX({ a: 1, b: 0, c: 0 });
        return {
          ok: true,
          kind: 'vertical',
          evaluateX: evalX,
          evaluate: () => NaN,
          usedParams: rhsCompiled.usedParams,
        };
      }
    }

    // 3. Implicit equation or inequality: F(x, y) = LHS - RHS
    const lhsCompiled = compileRawAst(lhsRaw);
    const rhsCompiled = compileRawAst(rhsRaw);
    const usedSet = new Set([...lhsCompiled.usedParams, ...rhsCompiled.usedParams]);
    const usedParams = ['a', 'b', 'c'].filter((p) => usedSet.has(p));

    const evaluateImplicit = (x, y, params = {}) => {
      const vars = {
        x,
        y,
        a: Number(params.a ?? 1),
        b: Number(params.b ?? 0),
        c: Number(params.c ?? 0),
      };
      return evalAst(lhsCompiled.ast, vars) - evalAst(rhsCompiled.ast, vars);
    };

    // Dry run
    evaluateImplicit(1, 1, { a: 1, b: 0, c: 0 });

    if (op === '=') {
      return {
        ok: true,
        kind: 'implicit',
        evaluateImplicit,
        evaluate: () => NaN,
        usedParams,
      };
    }

    return {
      ok: true,
      kind: 'implicitInequality',
      op,
      strict: op === '<' || op === '>',
      evaluateImplicit,
      evaluate: () => NaN,
      usedParams,
    };
  } catch (err) {
    return {
      ok: false,
      kind: 'function',
      error: err?.message || 'Syntax error',
      evaluate: () => NaN,
      usedParams: [],
    };
  }
}

/**
 * High-precision 4-point central difference derivative f'(x)
 */
export function numericDerivative(evaluate, x, params, h = 1e-4) {
  const f1 = evaluate(x + h, params);
  const f_1 = evaluate(x - h, params);
  const f2 = evaluate(x + 2 * h, params);
  const f_2 = evaluate(x - 2 * h, params);
  if (
    !Number.isFinite(f1) ||
    !Number.isFinite(f_1) ||
    !Number.isFinite(f2) ||
    !Number.isFinite(f_2)
  ) {
    // Fallback to simple central diff if near domain boundary
    if (Number.isFinite(f1) && Number.isFinite(f_1)) {
      return (f1 - f_1) / (2 * h);
    }
    return NaN;
  }
  const deriv = (-f2 + 8 * f1 - 8 * f_1 + f_2) / (12 * h);
  return Number.isFinite(deriv) ? deriv : NaN;
}

/**
 * Second derivative f''(x)
 */
export function numericSecondDerivative(evaluate, x, params, h = 5e-3) {
  const fp = evaluate(x + h, params);
  const fc = evaluate(x, params);
  const fm = evaluate(x - h, params);
  if (!Number.isFinite(fp) || !Number.isFinite(fc) || !Number.isFinite(fm)) {
    return NaN;
  }
  const d2 = (fp - 2 * fc + fm) / (h * h);
  return Number.isFinite(d2) ? d2 : NaN;
}

/**
 * Composite Simpson's rule definite integral \int_a^b f(x) dx
 */
export function computeDefiniteIntegral(evaluate, a, b, params, subintervals = 240) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { valid: false, value: NaN };
  }
  if (Math.abs(b - a) < 1e-12) {
    return { valid: true, value: 0 };
  }
  const n = subintervals % 2 === 0 ? subintervals : subintervals + 1;
  const h = (b - a) / n;
  let sum = 0;

  for (let i = 0; i <= n; i += 1) {
    const x = a + i * h;
    const y = evaluate(x, params);
    if (!Number.isFinite(y) || Math.abs(y) > 1e8) {
      return { valid: false, value: NaN };
    }
    const weight = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
    sum += weight * y;
  }

  const value = (h / 3) * sum;
  return Number.isFinite(value) ? { valid: true, value } : { valid: false, value: NaN };
}

function snapNiceNumber(val) {
  if (!Number.isFinite(val)) return val;
  if (Math.abs(val) < 0.005) return 0;
  const nearestHalf = Math.round(val * 2) / 2;
  if (Math.abs(val - nearestHalf) < 0.005) return nearestHalf;
  const nearestHundredth = Math.round(val * 100) / 100;
  if (Math.abs(val - nearestHundredth) < 0.003) return nearestHundredth;
  return Number(val.toFixed(3));
}

/**
 * Bisection refinement for f(x) = 0 on [x1, x2]
 */
function bisectRoot(fn, x1, x2, iterations = 22) {
  let lo = x1;
  let hi = x2;
  let fLo = fn(lo);
  if (!Number.isFinite(fLo)) return null;
  if (Math.abs(fLo) < 1e-9) return lo;

  for (let i = 0; i < iterations; i += 1) {
    const mid = (lo + hi) * 0.5;
    const fMid = fn(mid);
    if (!Number.isFinite(fMid)) return null;
    if (Math.abs(fMid) < 1e-9) return mid;
    if ((fLo < 0 && fMid < 0) || (fLo > 0 && fMid > 0)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  const finalX = (lo + hi) * 0.5;
  const finalY = fn(finalX);
  return Number.isFinite(finalY) && Math.abs(finalY) < 0.05 ? finalX : null;
}

/**
 * Analyze visible window [xMin, xMax] x [yMin, yMax] for:
 * - y-intercept (x = 0)
 * - x-intercepts (roots)
 * - local extrema (min/max vertices)
 * - inflection points (f''(x) = 0)
 * - vertical, horizontal, and oblique asymptotes (y = mx + b)
 */
export function analyzeFunctionFeatures(evaluate, params, viewport) {
  const { xMin, xMax, yMin, yMax } = viewport;
  const xSpan = xMax - xMin;
  const ySpan = yMax - yMin;
  if (!(xSpan > 0 && ySpan > 0)) {
    return {
      yIntercept: null,
      xIntercepts: [],
      extrema: [],
      inflectionPoints: [],
      verticalAsymptotes: [],
      horizontalAsymptotes: [],
      obliqueAsymptotes: [],
    };
  }

  const f = (x) => evaluate(x, params);
  const samples = 260;
  const dx = xSpan / samples;

  const yInterceptVal = f(0);
  const yIntercept =
    0 >= xMin &&
    0 <= xMax &&
    Number.isFinite(yInterceptVal) &&
    yInterceptVal >= yMin - ySpan &&
    yInterceptVal <= yMax + ySpan
      ? { x: 0, y: yInterceptVal }
      : null;

  const xIntercepts = [];
  const extrema = [];
  const inflectionPoints = [];
  const verticalAsymptotes = [];

  let prevX = xMin;
  let prevY = f(prevX);
  let prevSlope = NaN;
  let prevD2 = NaN;

  const pushUnique = (arr, item, tol = xSpan * 0.015) => {
    if (!arr.some((existing) => Math.abs(existing.x - item.x) < tol)) {
      arr.push(item);
    }
  };

  for (let i = 1; i <= samples; i += 1) {
    const curX = xMin + i * dx;
    const curY = f(curX);

    if (Number.isFinite(prevY) && Number.isFinite(curY)) {
      const jump = Math.abs(curY - prevY);
      const isAsymptoteJump =
        jump > ySpan * 1.4 &&
        ((prevY > 0 && curY < 0) || (prevY < 0 && curY > 0)) &&
        Math.abs(prevY) > ySpan * 0.25 &&
        Math.abs(curY) > ySpan * 0.25;

      if (isAsymptoteJump) {
        let lo = prevX;
        let hi = curX;
        for (let b = 0; b < 14; b += 1) {
          const mid = (lo + hi) * 0.5;
          const yMid = f(mid);
          if (!Number.isFinite(yMid)) {
            lo = mid;
            break;
          }
          if ((yMid > 0) === (prevY > 0)) lo = mid;
          else hi = mid;
        }
        const poleX = snapNiceNumber((lo + hi) * 0.5);
        if (!verticalAsymptotes.some((v) => Math.abs(v - poleX) < xSpan * 0.02)) {
          verticalAsymptotes.push(poleX);
        }
        prevSlope = NaN;
        prevD2 = NaN;
      } else {
        // Root check
        if ((prevY < 0 && curY > 0) || (prevY > 0 && curY < 0) || Math.abs(curY) < 1e-6) {
          const root = Math.abs(curY) < 1e-6 ? curX : bisectRoot(f, prevX, curX);
          if (root !== null && Number.isFinite(root)) {
            pushUnique(xIntercepts, { x: root, y: 0 });
          }
        }

        // Local extremum check
        const curSlope = (curY - prevY) / dx;
        if (Number.isFinite(prevSlope) && Number.isFinite(curSlope)) {
          if ((prevSlope > 0 && curSlope < 0) || (prevSlope < 0 && curSlope > 0)) {
            const h = Math.max(dx * 0.02, 1e-4);
            const dFn = (xVal) => (f(xVal + h) - f(xVal - h)) / (2 * h);
            const extX = bisectRoot(dFn, prevX - dx, curX, 16);
            if (extX !== null) {
              const extY = f(extX);
              if (Number.isFinite(extY) && Math.abs(extY) < ySpan * 4) {
                pushUnique(extrema, {
                  x: extX,
                  y: extY,
                  type: prevSlope > 0 ? 'max' : 'min',
                });
              }
            }
          }
        }
        prevSlope = curSlope;

        // Inflection point check (sign change in f''(x))
        const curD2 = numericSecondDerivative(evaluate, curX, params, Math.max(dx * 0.25, 0.005));
        if (Number.isFinite(prevD2) && Number.isFinite(curD2)) {
          if ((prevD2 > 0 && curD2 < 0) || (prevD2 < 0 && curD2 > 0)) {
            const d2Fn = (xVal) => numericSecondDerivative(evaluate, xVal, params, 0.005);
            const infX = bisectRoot(d2Fn, prevX, curX, 14);
            if (infX !== null) {
              const infY = f(infX);
              const infD2After = d2Fn(infX + 0.02);
              const infD2Before = d2Fn(infX - 0.02);
              if (
                Number.isFinite(infY) &&
                Math.abs(infY) < ySpan * 3 &&
                Number.isFinite(infD2Before) &&
                Number.isFinite(infD2After) &&
                infD2Before * infD2After < 0
              ) {
                pushUnique(inflectionPoints, { x: infX, y: infY });
              }
            }
          }
        }
        prevD2 = curD2;
      }
    } else if (!Number.isFinite(curY) && Number.isFinite(prevY)) {
      const nextX = curX + dx;
      const nextY = f(nextX);
      if (Number.isFinite(nextY) && Math.abs(prevY) > ySpan * 0.3 && Math.abs(nextY) > ySpan * 0.3) {
        const poleX = snapNiceNumber(curX);
        if (!verticalAsymptotes.some((v) => Math.abs(v - poleX) < xSpan * 0.02)) {
          verticalAsymptotes.push(poleX);
        }
      }
      prevSlope = NaN;
      prevD2 = NaN;
    } else {
      prevSlope = NaN;
      prevD2 = NaN;
    }

    prevX = curX;
    prevY = curY;
  }

  // Asymptote checks at +/- infinity: horizontal & oblique (slant)
  const horizontalAsymptotes = [];
  const obliqueAsymptotes = [];

  const checkAsymptotesAtInfinity = (sign) => {
    const x1 = sign * 4000;
    const x2 = sign * 8000;
    const x3 = sign * 16000;
    const y1 = f(x1);
    const y2 = f(x2);
    const y3 = f(x3);

    if (!Number.isFinite(y1) || !Number.isFinite(y2) || !Number.isFinite(y3)) return;

    // 1. Horizontal asymptote y = L
    if (Math.abs(y2 - y1) < 0.04 && Math.abs(y3 - y2) < 0.01 && Math.abs(y3) < 1e4) {
      const snappedH = snapNiceNumber(y3);
      if (!horizontalAsymptotes.some((h) => Math.abs(h - snappedH) < 0.02)) {
        horizontalAsymptotes.push(snappedH);
      }
      return;
    }

    // 2. Oblique asymptote y = mx + b
    const m1 = (y2 - y1) / (x2 - x1);
    const m2 = (y3 - y2) / (x3 - x2);
    if (
      Number.isFinite(m1) &&
      Number.isFinite(m2) &&
      Math.abs(m2 - m1) < 1e-4 &&
      Math.abs(m2) > 0.01 &&
      Math.abs(m2) < 500
    ) {
      const b1 = y2 - m2 * x2;
      const b2 = y3 - m2 * x3;
      if (Math.abs(b2 - b1) < 0.05 && Math.abs(b2) < 1e4) {
        // Verify it is not trivially a pure linear function everywhere
        const midTestX = 1.37;
        const midDiff = Math.abs(f(midTestX) - (m2 * midTestX + b2));
        if (!Number.isFinite(midDiff) || midDiff > 1e-4) {
          const snappedM = snapNiceNumber(m2);
          const snappedB = snapNiceNumber(b2);
          if (
            !obliqueAsymptotes.some(
              (o) => Math.abs(o.m - snappedM) < 0.02 && Math.abs(o.b - snappedB) < 0.02
            )
          ) {
            obliqueAsymptotes.push({ m: snappedM, b: snappedB });
          }
        }
      }
    }
  };

  checkAsymptotesAtInfinity(1);
  checkAsymptotesAtInfinity(-1);

  return {
    yIntercept,
    xIntercepts: xIntercepts.slice(0, 8),
    extrema: extrema.slice(0, 6),
    inflectionPoints: inflectionPoints.slice(0, 6),
    verticalAsymptotes: verticalAsymptotes.slice(0, 6),
    horizontalAsymptotes: horizontalAsymptotes.slice(0, 2),
    obliqueAsymptotes: obliqueAsymptotes.slice(0, 2),
  };
}

/**
 * Find intersection points between two visible functions
 */
export function findCurveIntersections(fnA, fnB, params, viewport) {
  const { xMin, xMax, yMin, yMax } = viewport;
  const xSpan = xMax - xMin;
  const ySpan = yMax - yMin;
  const diff = (x) => {
    const a = fnA(x, params);
    const b = fnB(x, params);
    return Number.isFinite(a) && Number.isFinite(b) ? a - b : NaN;
  };

  const samples = 220;
  const dx = xSpan / samples;
  const pts = [];
  let prevX = xMin;
  let prevD = diff(prevX);

  for (let i = 1; i <= samples; i += 1) {
    const curX = xMin + i * dx;
    const curD = diff(curX);
    if (Number.isFinite(prevD) && Number.isFinite(curD)) {
      if ((prevD < 0 && curD > 0) || (prevD > 0 && curD < 0)) {
        const root = bisectRoot(diff, prevX, curX, 18);
        if (root !== null) {
          const yVal = fnA(root, params);
          if (
            Number.isFinite(yVal) &&
            yVal >= yMin - ySpan * 0.1 &&
            yVal <= yMax + ySpan * 0.1 &&
            !pts.some((p) => Math.abs(p.x - root) < xSpan * 0.015)
          ) {
            pts.push({ x: root, y: yVal });
          }
        }
      }
    }
    prevX = curX;
    prevD = curD;
  }

  return pts.slice(0, 8);
}

/**
 * Marching Squares contour segments for implicit equation F(x, y) = 0
 */
export function computeImplicitContours(evaluateImplicit, params, viewport, cols = 88, rows = 66) {
  const { xMin, xMax, yMin, yMax } = viewport;
  const dx = (xMax - xMin) / cols;
  const dy = (yMax - yMin) / rows;
  if (!(dx > 0 && dy > 0)) return [];

  const grid = Array.from({ length: rows + 1 }, (_, r) => {
    const wy = yMin + r * dy;
    return Array.from({ length: cols + 1 }, (_, c) => {
      const wx = xMin + c * dx;
      return evaluateImplicit(wx, wy, params);
    });
  });

  const interp = (x1, y1, v1, x2, y2, v2) => {
    const denom = v1 - v2;
    const t = Math.abs(denom) < 1e-12 ? 0.5 : Math.max(0, Math.min(1, v1 / denom));
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  };

  const segments = [];

  for (let r = 0; r < rows; r += 1) {
    const y0 = yMin + r * dy;
    const y1 = y0 + dy;
    for (let c = 0; c < cols; c += 1) {
      const x0 = xMin + c * dx;
      const x1 = x0 + dx;

      const v00 = grid[r][c];
      const v10 = grid[r][c + 1];
      const v11 = grid[r + 1][c + 1];
      const v01 = grid[r + 1][c];

      if (
        !Number.isFinite(v00) ||
        !Number.isFinite(v10) ||
        !Number.isFinite(v11) ||
        !Number.isFinite(v01)
      ) {
        continue;
      }

      // Skip huge singular jumps (e.g. 1/x-like poles masquerading as zero crossing)
      const maxJump = Math.max(
        Math.abs(v10 - v00),
        Math.abs(v11 - v10),
        Math.abs(v01 - v11),
        Math.abs(v00 - v01)
      );
      if (maxJump > 250) continue;

      const mask =
        (v00 > 0 ? 1 : 0) |
        (v10 > 0 ? 2 : 0) |
        (v11 > 0 ? 4 : 0) |
        (v01 > 0 ? 8 : 0);

      if (mask === 0 || mask === 15) continue;

      // Edges: 0=bottom(00-10), 1=right(10-11), 2=top(11-01), 3=left(01-00)
      const edgePt = (e) => {
        if (e === 0) return interp(x0, y0, v00, x1, y0, v10);
        if (e === 1) return interp(x1, y0, v10, x1, y1, v11);
        if (e === 2) return interp(x1, y1, v11, x0, y1, v01);
        return interp(x0, y1, v01, x0, y0, v00);
      };

      const table = {
        1: [[3, 0]],
        2: [[0, 1]],
        3: [[3, 1]],
        4: [[1, 2]],
        5: [
          [3, 2],
          [0, 1],
        ],
        6: [[0, 2]],
        7: [[3, 2]],
        8: [[2, 3]],
        9: [[0, 2]],
        10: [
          [0, 3],
          [1, 2],
        ],
        11: [[1, 2]],
        12: [[1, 3]],
        13: [[0, 1]],
        14: [[3, 0]],
      };

      const pairs = table[mask];
      if (!pairs) continue;
      for (const [eA, eB] of pairs) {
        segments.push([edgePt(eA), edgePt(eB)]);
      }
    }
  }

  return segments;
}

export function formatLinearEquation(m, b) {
  const mStr = m === 1 ? 'x' : m === -1 ? '-x' : `${formatCoordNumber(m)}x`;
  if (Math.abs(b) < 1e-4) return `y = ${mStr}`;
  const sign = b > 0 ? '+' : '-';
  return `y = ${mStr} ${sign} ${formatCoordNumber(Math.abs(b))}`;
}

export function formatCoordNumber(val) {
  if (!Number.isFinite(val)) return 'មិនកំណត់';
  if (Math.abs(val) < 1e-6) return '0';
  const rounded = Math.round(val * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(Number(rounded.toFixed(2)));
}

function classifyExplicitExpression(expr, evaluate, params, analysisItem) {
  const lower = String(expr || '').toLowerCase();
  const hasDivByVar = /\/[^)]*[x]/i.test(lower) || (analysisItem?.verticalAsymptotes?.length || 0) > 0;

  if (/(sin|cos|tan|cot|sec|csc|asin|acos|atan)/.test(lower)) {
    return {
      km: 'អនុគមន៍ត្រីកោណមាត្រ',
      en: 'Trigonometric Function',
      hintKm: 'មានលក្ខណៈជាខួបដដែលៗ (ណែនាំឲ្យបើកមាត្រដ្ឋាន π នៅអ័ក្ស Ox)។',
      hintEn: 'Periodic wave behavior (try toggling the π X-axis scale).',
    };
  }
  if (/(exp\(|e\^|ln\(|log\(|log2\()/.test(lower)) {
    const isLog = /(ln\(|log\(|log2\()/.test(lower);
    return {
      km: isLog ? 'អនុគមន៍លោការីត' : 'អនុគមន៍អិចស្ប៉ូណង់ស្យែល',
      en: isLog ? 'Logarithmic Function' : 'Exponential Function',
      hintKm: isLog
        ? 'កំណត់ចំពោះតម្លៃក្នុងលោការីតធំជាង 0 (> 0) ។'
        : 'កើន ឬចុះយ៉ាងលឿន និងមានអាស៊ីមតូតដេកនៅម្ខាង។',
      hintEn: isLog
        ? 'Defined strictly where the logarithm argument > 0.'
        : 'Rapid growth/decay with a horizontal asymptote on one side.',
    };
  }
  if (/(abs\(|\|)/.test(lower)) {
    return {
      km: 'អនុគមន៍តម្លៃដាច់ខាត',
      en: 'Absolute Value Function',
      hintKm: 'ខ្សែកោងមានជ្រុងស្រួចត្រង់ចំណុចដែលកន្សោមក្នុង |...| ស្មើ 0 ។',
      hintEn: 'Sharp corner where the expression inside |...| equals zero.',
    };
  }
  if (/sqrt\(/i.test(lower)) {
    return {
      km: 'អនុគមន៍រ៉ាឌីកាល់',
      en: 'Radical Function',
      hintKm: 'កំណត់តែនៅតំបន់ដែលកន្សោមក្រោមឫស ≥ 0 ។',
      hintEn: 'Defined only where the expression under the square root ≥ 0.',
    };
  }
  if (hasDivByVar) {
    const hasOblique = (analysisItem?.obliqueAsymptotes?.length || 0) > 0;
    return {
      km: hasOblique ? 'អនុគមន៍សនិទាន (មានអាស៊ីមតូតទ្រេត)' : 'អនុគមន៍សនិទាន',
      en: hasOblique ? 'Rational Function (Oblique Asymptote)' : 'Rational Function',
      hintKm: 'ខ្សែកោងបំបែកជាផ្នែកនៅត្រង់ឫសភាគបែង (អាស៊ីមតូតឈរ) ។',
      hintEn: 'Splits into branches across vertical asymptotes where denominator = 0.',
    };
  }

  // Numerical degree check across sample points
  const pts = [-2.5, -1, 0.5, 2, 3.5];
  const d1 = pts.map((x) => numericDerivative(evaluate, x, params)).filter(Number.isFinite);
  const d2 = pts.map((x) => numericSecondDerivative(evaluate, x, params)).filter(Number.isFinite);

  if (d1.length >= 3 && d1.every((v) => Math.abs(v) < 1e-3)) {
    return {
      km: 'អនុគមន៍ថេរ (បន្ទាត់ដេក)',
      en: 'Constant Function',
      hintKm: 'មេគុណប្រាប់ទិសស្មើ 0 ស្របនឹងអ័ក្ស Ox ជានិច្ច។',
      hintEn: 'Zero slope; horizontal line parallel to the x-axis.',
    };
  }
  if (d2.length >= 3 && d2.every((v) => Math.abs(v) < 1e-2)) {
    const slope = d1[0] ?? 0;
    return {
      km: 'អនុគមន៍លីនេអ៊ែរ (បន្ទាត់ត្រង់)',
      en: 'Linear Function',
      hintKm:
        slope > 0
          ? `បន្ទាត់កើនជាប់ដោយមេគុណប្រាប់ទិស a ≈ ${formatCoordNumber(slope)} > 0 ។`
          : `បន្ទាត់ចុះជាប់ដោយមេគុណប្រាប់ទិស a ≈ ${formatCoordNumber(slope)} < 0 ។`,
      hintEn:
        slope > 0
          ? `Constant upward slope m ≈ ${formatCoordNumber(slope)} > 0.`
          : `Constant downward slope m ≈ ${formatCoordNumber(slope)} < 0.`,
    };
  }
  if (d2.length >= 3 && d2.every((v) => Math.abs(v - d2[0]) < 0.08) && Math.abs(d2[0]) > 0.02) {
    const opensUp = d2[0] > 0;
    return {
      km: 'អនុគមន៍ដឺក្រេទី២ (ប៉ារ៉ាបូល)',
      en: 'Quadratic Parabola',
      hintKm: opensUp
        ? 'ប៉ារ៉ាបូលបើកផ្ងារឡើងលើ (មានចំណុចកំពូលជាតម្លៃអប្បបរមា)។'
        : 'ប៉ារ៉ាបូលបើកផ្កាប់ចុះក្រោម (មានចំណុចកំពូលជាតម្លៃអតិបរមា)។',
      hintEn: opensUp
        ? 'Parabola opening upward with a global minimum vertex.'
        : 'Parabola opening downward with a global maximum vertex.',
    };
  }

  return {
    km: 'ខ្សែកោងពហុធា ឬអនុគមន៍ទូទៅ',
    en: 'Polynomial / General Curve',
    hintKm: 'ពិនិត្យសញ្ញា f\'(x) សម្រាប់ទិសដៅប្រែប្រួល និង f"(x) សម្រាប់ភាពកោង។',
    hintEn: 'Use f\'(x) for monotonicity and f"(x) for concavity.',
  };
}

function summarizeVariationAndConcavity(evaluate, params, viewport, analysisItem, isKm) {
  const { xMin, xMax } = viewport;
  const cuts = [
    xMin,
    ...(analysisItem?.extrema || []).map((e) => e.x),
    ...(analysisItem?.verticalAsymptotes || []),
    xMax,
  ]
    .filter((v) => Number.isFinite(v) && v >= xMin - 1e-6 && v <= xMax + 1e-6)
    .sort((a, b) => a - b);

  // Deduplicate cuts close together
  const cleanCuts = [];
  const tol = (xMax - xMin) * 0.015;
  for (const c of cuts) {
    if (cleanCuts.length === 0 || Math.abs(c - cleanCuts[cleanCuts.length - 1]) > tol) {
      cleanCuts.push(c);
    }
  }
  if (cleanCuts.length < 2) return { variationText: '', concavityText: '' };

  const varParts = [];
  for (let i = 0; i < cleanCuts.length - 1; i += 1) {
    const a = cleanCuts[i];
    const b = cleanCuts[i + 1];
    const mid = (a + b) * 0.5;
    const val = evaluate(mid, params);
    const slope = numericDerivative(evaluate, mid, params);
    if (!Number.isFinite(val) || !Number.isFinite(slope)) {
      varParts.push(
        isKm
          ? `មិនកំណត់លើ (${formatCoordNumber(a)}, ${formatCoordNumber(b)})`
          : `Undefined on (${formatCoordNumber(a)}, ${formatCoordNumber(b)})`
      );
      continue;
    }
    const dirLabel =
      Math.abs(slope) < 1e-4
        ? isKm
          ? 'ថេរ (→)'
          : 'Constant (→)'
        : slope > 0
        ? isKm
          ? 'កើន (↗)'
          : 'Increasing (↗)'
        : isKm
        ? 'ចុះ (↘)'
        : 'Decreasing (↘)';
    varParts.push(`${dirLabel} (${formatCoordNumber(a)}, ${formatCoordNumber(b)})`);
  }

  // Concavity across inflection points / poles
  const infCuts = [
    xMin,
    ...(analysisItem?.inflectionPoints || []).map((p) => p.x),
    ...(analysisItem?.verticalAsymptotes || []),
    xMax,
  ]
    .filter((v) => Number.isFinite(v) && v >= xMin - 1e-6 && v <= xMax + 1e-6)
    .sort((a, b) => a - b);

  const cleanInf = [];
  for (const c of infCuts) {
    if (cleanInf.length === 0 || Math.abs(c - cleanInf[cleanInf.length - 1]) > tol) {
      cleanInf.push(c);
    }
  }

  const concParts = [];
  for (let i = 0; i < cleanInf.length - 1; i += 1) {
    const a = cleanInf[i];
    const b = cleanInf[i + 1];
    const mid = (a + b) * 0.5;
    const d2 = numericSecondDerivative(evaluate, mid, params);
    if (!Number.isFinite(d2)) continue;
    if (Math.abs(d2) < 1e-3) continue;
    const concLabel =
      d2 > 0 ? (isKm ? 'ផតឡើង (∪)' : 'Concave up (∪)') : isKm ? 'ផតចុះ (∩)' : 'Concave down (∩)';
    concParts.push(`${concLabel} (${formatCoordNumber(a)}, ${formatCoordNumber(b)})`);
  }

  return {
    variationText: varParts.slice(0, 4).join(' · '),
    concavityText: concParts.slice(0, 3).join(' · '),
  };
}

/**
 * Generates an accurate, instant, offline mathematical explanation for every visible graph entry.
 */
export function buildOfflineGraphExplanation(compiledFunctions, params, viewport, analysis, isKm) {
  const analysisMap = new Map((analysis?.perFunction || []).map((a) => [a.id, a]));
  const items = [];

  for (const fn of compiledFunctions) {
    if (!fn.visible || !fn.compiled.ok) continue;
    const kind = fn.compiled.kind;

    if (kind === 'vertical') {
      const vx = fn.compiled.evaluateX(params);
      items.push({
        id: fn.id,
        expr: fn.expr,
        color: fn.color,
        typeLabel: isKm ? 'បន្ទាត់ឈរ' : 'Vertical Line',
        bullets: [
          isKm
            ? `បន្ទាត់ឈរកាត់អ័ក្ស Ox ត្រង់ x = ${formatCoordNumber(vx)} ហើយស្របនឹងអ័ក្ស Oy ។`
            : `Vertical line crossing x-axis at x = ${formatCoordNumber(vx)}, parallel to the y-axis.`,
          isKm
            ? 'បន្ទាត់ឈរមិនមែនជាអនុគមន៍ y = f(x) ទេ ព្រោះ x មួយមានតម្លៃ y អនន្ត។'
            : 'Vertical lines are relations rather than functions y = f(x).',
        ],
      });
      continue;
    }

    if (kind === 'inequality') {
      const boundary = fn.compiled.strict
        ? isKm
          ? 'បន្ទាត់ដាច់ (មិនរាប់បញ្ចូលព្រំដែន)'
          : 'Dashed boundary (excluded)'
        : isKm
        ? 'បន្ទាត់ជាប់ (រាប់បញ្ចូលព្រំដែន)'
        : 'Solid boundary (included)';
      const isBelow = fn.compiled.op === '<' || fn.compiled.op === '<=';
      items.push({
        id: fn.id,
        expr: fn.expr,
        color: fn.color,
        typeLabel: isKm ? 'វិសមភាពលើប្លង់' : 'Planar Inequality',
        bullets: [
          isKm
            ? `តំបន់លាបពណ៌តំណាងឲ្យចំណុច (x, y) ទាំងអស់ដែលស្ថិតនៅ${isBelow ? 'ខាងក្រោម' : 'ខាងលើ'}ខ្សែកោង y = ${fn.compiled.normalized} ។`
            : `Shaded region contains all (x, y) ${isBelow ? 'below' : 'above'} y = ${fn.compiled.normalized}.`,
          boundary,
        ],
      });
      continue;
    }

    if (kind === 'implicit' || kind === 'implicitInequality') {
      const clean = fn.expr.replace(/\s+/g, '').toLowerCase();
      const isCircle = /x\^2\+y\^2=/.test(clean) || /x\^2\+y\^2<=|>=|<|>/.test(clean);
      const isEllipse = /x\^2\/\d+\+y\^2\/\d+/.test(clean);
      const typeLabel =
        kind === 'implicitInequality'
          ? isKm
            ? 'តំបន់វិសមភាពពីរអញ្ញាតិ'
            : '2-Variable Inequality Region'
          : isCircle
          ? isKm
            ? 'សមីការរង្វង់ (Conic)'
            : 'Circle Equation'
          : isEllipse
          ? isKm
            ? 'សមីការអេលីប (Conic)'
            : 'Ellipse Equation'
          : isKm
          ? 'ខ្សែកោងអនុប្បធាតុ F(x, y) = 0'
          : 'Implicit Curve F(x, y) = 0';

      items.push({
        id: fn.id,
        expr: fn.expr,
        color: fn.color,
        typeLabel,
        bullets: [
          kind === 'implicitInequality'
            ? isKm
              ? 'ផ្ទៃលាបពណ៌គឺជាសំណុំចំណុច (x, y) ដែលផ្ទៀងផ្ទាត់វិសមភាពនេះ។'
              : 'Shaded area represents all points (x, y) satisfying this inequality.'
            : isKm
            ? 'គូសដោយរកគ្រប់ចំណុច (x, y) ដែលធ្វើឲ្យអង្គឆ្វេងស្មើនឹងអង្គស្ដាំ ។'
            : 'Plotted along the contour where LHS(x, y) = RHS(x, y).',
          isKm
            ? 'អ្នកអាចចង្អុលលើខ្សែកោងដើម្បីអានតម្លៃ (x, y) ជាក់ស្ដែង។'
            : 'Hover along the contour to trace exact (x, y) coordinates.',
        ],
      });
      continue;
    }

    // Explicit function y = f(x)
    const aItem = analysisMap.get(fn.id);
    const cls = classifyExplicitExpression(fn.expr, fn.compiled.evaluate, params, aItem);
    const { variationText, concavityText } = summarizeVariationAndConcavity(
      fn.compiled.evaluate,
      params,
      viewport,
      aItem,
      isKm
    );

    const bullets = [isKm ? cls.hintKm : cls.hintEn];
    if (variationText) {
      bullets.push(
        isKm ? `ទិសដៅប្រែប្រួលក្នុងផ្ទាំង៖ ${variationText}` : `Variation in view: ${variationText}`
      );
    }
    if (concavityText) {
      bullets.push(isKm ? `ភាពកោង៖ ${concavityText}` : `Concavity: ${concavityText}`);
    }

    if (aItem) {
      if (aItem.extrema.length > 0) {
        const extStr = aItem.extrema
          .map(
            (e) =>
              `${e.type === 'max' ? (isKm ? 'អតិបរមា' : 'Max') : isKm ? 'អប្បបរមា' : 'Min'} (${formatCoordNumber(e.x)}, ${formatCoordNumber(e.y)})`
          )
          .join(', ');
        bullets.push(isKm ? `ចំណុចបរមា៖ ${extStr}` : `Extrema: ${extStr}`);
      }

      const asymps = [
        ...aItem.verticalAsymptotes.map((vx) => `${isKm ? 'ឈរ' : 'Vert.'} x = ${formatCoordNumber(vx)}`),
        ...aItem.horizontalAsymptotes.map((hy) => `${isKm ? 'ដេក' : 'Horiz.'} y = ${formatCoordNumber(hy)}`),
        ...aItem.obliqueAsymptotes.map((o) => `${isKm ? 'ទ្រេត' : 'Obl.'} ${formatLinearEquation(o.m, o.b)}`),
      ];
      if (asymps.length > 0) {
        bullets.push(isKm ? `អាស៊ីមតូត៖ ${asymps.join(' · ')}` : `Asymptotes: ${asymps.join(' · ')}`);
      }

      const intercepts = [];
      if (aItem.yIntercept) {
        intercepts.push(`Oy (0, ${formatCoordNumber(aItem.yIntercept.y)})`);
      }
      if (aItem.xIntercepts.length > 0) {
        intercepts.push(
          `Ox ${aItem.xIntercepts.map((p) => `(${formatCoordNumber(p.x)}, 0)`).join(', ')}`
        );
      }
      if (intercepts.length > 0) {
        bullets.push(
          isKm ? `ចំណុចកាត់អ័ក្ស៖ ${intercepts.join(' · ')}` : `Intercepts: ${intercepts.join(' · ')}`
        );
      }
    }

    items.push({
      id: fn.id,
      expr: fn.expr,
      color: fn.color,
      typeLabel: isKm ? cls.km : cls.en,
      bullets,
    });
  }

  return items;
}

