import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  SlidersHorizontal,
  Table as TableIcon,
  MapPin,
  Grid,
  Crosshair,
  AlertCircle,
  Compass,
  BookOpen,
  Loader2,
  Copy,
  Check,
  Camera,
  Image as ImageIcon,
  X,
  MessageSquarePlus,
  Send,
  Delete,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  compileGraphEntry,
  analyzeFunctionFeatures,
  findCurveIntersections,
  computeImplicitContours,
  numericDerivative,
  computeDefiniteIntegral,
  buildOfflineGraphExplanation,
  formatLinearEquation,
  formatCoordNumber,
} from '../utils/mathGraphParser';

const STORAGE_KEY = 'wsd_graph_lab_state_v1';

const CURVE_COLORS = [
  '#38BDF8', // Sky cyan
  '#F59E0B', // Warm amber
  '#34D399', // Emerald
  '#FB7185', // Rose
  '#A78BFA', // Violet
];

const KEYPAD_TABS = {
  basic: {
    colsClass: 'grid-cols-5',
    keys: [
      // Row 1: core algebra
      { label: 'x', insert: 'x', kind: 'var' },
      { label: 'y', insert: 'y', kind: 'var' },
      { label: 'x²', insert: '^2', kind: 'op' },
      { label: 'xⁿ', insert: '^', kind: 'op' },
      { label: '√', insert: 'sqrt()', kind: 'op' },
      // Row 2
      { label: '7', insert: '7', kind: 'num' },
      { label: '8', insert: '8', kind: 'num' },
      { label: '9', insert: '9', kind: 'num' },
      { label: '÷', insert: '/', kind: 'op' },
      { label: '(', insert: '(', kind: 'op' },
      // Row 3
      { label: '4', insert: '4', kind: 'num' },
      { label: '5', insert: '5', kind: 'num' },
      { label: '6', insert: '6', kind: 'num' },
      { label: '×', insert: '*', kind: 'op' },
      { label: ')', insert: ')', kind: 'op' },
      // Row 4
      { label: '1', insert: '1', kind: 'num' },
      { label: '2', insert: '2', kind: 'num' },
      { label: '3', insert: '3', kind: 'num' },
      { label: '−', insert: '-', kind: 'op' },
      { label: '=', insert: ' = ', kind: 'op' },
      // Row 5
      { label: '0', insert: '0', kind: 'num' },
      { label: '.', insert: '.', kind: 'num' },
      { label: 'π', insert: 'pi', kind: 'var' },
      { label: '+', insert: '+', kind: 'op' },
      { label: '|x|', insert: 'abs()', kind: 'op' },
    ],
  },
  func: {
    colsClass: 'grid-cols-4',
    keys: [
      // Row 1: primary trig
      { label: 'sin', insert: 'sin()', kind: 'fn' },
      { label: 'cos', insert: 'cos()', kind: 'fn' },
      { label: 'tan', insert: 'tan()', kind: 'fn' },
      { label: 'cot', insert: 'cot()', kind: 'fn' },
      // Row 2: reciprocal & inverse trig
      { label: 'sec', insert: 'sec()', kind: 'fn' },
      { label: 'csc', insert: 'csc()', kind: 'fn' },
      { label: 'sin⁻¹', insert: 'asin()', kind: 'fn' },
      { label: 'cos⁻¹', insert: 'acos()', kind: 'fn' },
      // Row 3: inverse tan & hyperbolic
      { label: 'tan⁻¹', insert: 'atan()', kind: 'fn' },
      { label: 'sinh', insert: 'sinh()', kind: 'fn' },
      { label: 'cosh', insert: 'cosh()', kind: 'fn' },
      { label: 'tanh', insert: 'tanh()', kind: 'fn' },
      // Row 4: exp & log
      { label: 'eˣ', insert: 'exp()', kind: 'fn' },
      { label: 'ln', insert: 'ln()', kind: 'fn' },
      { label: 'log', insert: 'log()', kind: 'fn' },
      { label: 'log₂', insert: 'log2()', kind: 'fn' },
      // Row 5: roots & constants
      { label: '√', insert: 'sqrt()', kind: 'op' },
      { label: '∛', insert: 'cbrt()', kind: 'op' },
      { label: 'π', insert: 'pi', kind: 'var' },
      { label: 'e', insert: 'e', kind: 'var' },
    ],
  },
  extra: {
    colsClass: 'grid-cols-4',
    keys: [
      // Row 1: inequalities
      { label: '<', insert: ' < ', kind: 'op' },
      { label: '>', insert: ' > ', kind: 'op' },
      { label: '≤', insert: ' <= ', kind: 'op' },
      { label: '≥', insert: ' >= ', kind: 'op' },
      // Row 2: slider parameters & fraction
      { label: 'a', insert: 'a', kind: 'var' },
      { label: 'b', insert: 'b', kind: 'var' },
      { label: 'c', insert: 'c', kind: 'var' },
      { label: 'a/b', insert: '/', kind: 'op' },
      // Row 3: powers
      { label: 'x²', insert: '^2', kind: 'op' },
      { label: 'x³', insert: '^3', kind: 'op' },
      { label: 'xⁿ', insert: '^', kind: 'op' },
      { label: 'x⁻¹', insert: '^(-1)', kind: 'op' },
      // Row 4: step & rounding functions
      { label: '⌊x⌋', insert: 'floor()', kind: 'fn' },
      { label: '⌈x⌉', insert: 'ceil()', kind: 'fn' },
      { label: 'round', insert: 'round()', kind: 'fn' },
      { label: 'sign', insert: 'sign()', kind: 'fn' },
    ],
  },
};

const SMART_BACKSPACE_TOKENS = [
  'floor(',
  'round(',
  'sqrt(',
  'cbrt(',
  'asin(',
  'acos(',
  'atan(',
  'sinh(',
  'cosh(',
  'tanh(',
  'log2(',
  'ceil(',
  'sign(',
  'sin(',
  'cos(',
  'tan(',
  'cot(',
  'sec(',
  'csc(',
  'abs(',
  'exp(',
  'log(',
  'ln(',
  ' <= ',
  ' >= ',
  ' = ',
  ' < ',
  ' > ',
  'pi',
];

const CURRICULUM_PRESETS = [
  {
    id: 'linear',
    labelKm: 'បន្ទាត់',
    labelEn: 'Linear',
    piAxis: false,
    items: [
      { expr: '2x - 1', color: CURVE_COLORS[0] },
      { expr: '-0.5x + 2', color: CURVE_COLORS[1] },
    ],
  },
  {
    id: 'parabola',
    labelKm: 'ប៉ារ៉ាបូល',
    labelEn: 'Parabola',
    piAxis: false,
    items: [{ expr: 'x^2 - 4x + 3', color: CURVE_COLORS[0] }],
  },
  {
    id: 'oblique',
    labelKm: 'សនិទាន & ទ្រេត',
    labelEn: 'Oblique Asymp.',
    piAxis: false,
    items: [{ expr: '(x^2 + 1)/(x - 1)', color: CURVE_COLORS[0] }],
  },
  {
    id: 'conic',
    labelKm: 'រង្វង់ & អេលីប',
    labelEn: 'Circle & Ellipse',
    piAxis: false,
    items: [
      { expr: 'x^2 + y^2 = 9', color: CURVE_COLORS[0] },
      { expr: 'x^2/16 + y^2/4 = 1', color: CURVE_COLORS[1] },
    ],
  },
  {
    id: 'inequality',
    labelKm: 'វិសមភាព',
    labelEn: 'Inequality',
    piAxis: false,
    items: [
      { expr: 'y <= x + 2', color: CURVE_COLORS[0] },
      { expr: 'y >= x^2 - 2', color: CURVE_COLORS[1] },
    ],
  },
  {
    id: 'trig',
    labelKm: 'ត្រីកោណមាត្រ',
    labelEn: 'Trig (π)',
    piAxis: true,
    items: [
      { expr: 'sin(x)', color: CURVE_COLORS[0] },
      { expr: 'cos(x)', color: CURVE_COLORS[2] },
    ],
  },
  {
    id: 'param',
    labelKm: 'ប៉ារ៉ាម៉ែត្រ a, b, c',
    labelEn: 'Sliders a, b, c',
    piAxis: false,
    items: [{ expr: 'a*x^2 + b*x + c', color: CURVE_COLORS[0] }],
    params: { a: 1, b: -2, c: -1 },
  },
];

function getNiceGridStep(rawSpan, targetTicks = 10) {
  const rough = rawSpan / targetTicks;
  if (!(rough > 0 && Number.isFinite(rough))) return 1;
  const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow10;
  let nice = 1;
  if (norm >= 5) nice = 5;
  else if (norm >= 2) nice = 2;
  else nice = 1;
  return nice * pow10;
}

function getNicePiStep(rawSpan, targetTicks = 8) {
  const candidates = [
    Math.PI / 6,
    Math.PI / 4,
    Math.PI / 2,
    Math.PI,
    2 * Math.PI,
    4 * Math.PI,
    8 * Math.PI,
  ];
  const target = rawSpan / targetTicks;
  for (const c of candidates) {
    if (c >= target) return c;
  }
  return candidates[candidates.length - 1];
}

function formatAxisTick(val, step) {
  if (Math.abs(val) < step * 0.001) return '0';
  if (step >= 1) return String(Math.round(val));
  const decimals = Math.min(4, Math.max(1, -Math.floor(Math.log10(step)) + 1));
  return String(Number(val.toFixed(decimals)));
}

function formatPiTick(val) {
  const ratio = val / Math.PI;
  if (Math.abs(ratio) < 1e-4) return '0';
  const denoms = [1, 2, 3, 4, 6];
  for (const d of denoms) {
    const num = Math.round(ratio * d);
    if (Math.abs(ratio - num / d) < 1e-3) {
      if (num === 0) return '0';
      const sign = num < 0 ? '-' : '';
      const absN = Math.abs(num);
      const numStr = absN === 1 ? 'π' : `${absN}π`;
      return d === 1 ? `${sign}${numStr}` : `${sign}${numStr}/${d}`;
    }
  }
  return String(Number(val.toFixed(2)));
}

function readSavedState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function GraphPage() {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const isKm = language === 'km';

  const defaultStudentName = currentUser
    ? `${currentUser.last_name || ''} ${currentUser.first_name || ''}`.trim()
    : '';

  const initialExpr = searchParams.get('expr')?.trim();
  const savedState = useMemo(() => readSavedState(), []);

  const [functions, setFunctions] = useState(() => {
    if (initialExpr) {
      return [{ id: 'fn-1', expr: initialExpr, color: CURVE_COLORS[0], visible: true, showDerivative: false }];
    }
    if (Array.isArray(savedState?.functions) && savedState.functions.length > 0) {
      return savedState.functions;
    }
    return [
      { id: 'fn-1', expr: 'x^2 - 4x + 3', color: CURVE_COLORS[0], visible: true, showDerivative: false },
      { id: 'fn-2', expr: 'x - 1', color: CURVE_COLORS[1], visible: true, showDerivative: false },
    ];
  });

  const [activeFnId, setActiveFnId] = useState(() => functions[0]?.id || 'fn-1');
  const [params, setParams] = useState(() => savedState?.params || { a: 1, b: 0, c: 0 });
  const [showSlidersOverride, setShowSlidersOverride] = useState(false);

  // Viewport & Canvas options
  const [view, setView] = useState(() => savedState?.view || { centerX: 0, centerY: 0, scale: 42 });
  const [showGrid, setShowGrid] = useState(() => savedState?.showGrid ?? true);
  const [showKeyPoints, setShowKeyPoints] = useState(() => savedState?.showKeyPoints ?? true);
  const [showAsymptotes, setShowAsymptotes] = useState(() => savedState?.showAsymptotes ?? true);
  const [piAxis, setPiAxis] = useState(() => (initialExpr ? false : Boolean(savedState?.piAxis)));

  // Side deck tabs: 'functions' | 'table' | 'analysis' | 'points'
  const [deckTab, setDeckTab] = useState('functions');
  // Scientific keypad tabs: 'basic' | 'func' | 'extra'
  const [keypadTab, setKeypadTab] = useState('basic');

  // Table config
  const [tableFnId, setTableFnId] = useState(() => functions[0]?.id || 'fn-1');
  const [tableStart, setTableStart] = useState('-4');
  const [tableEnd, setTableEnd] = useState('4');
  const [tableStep, setTableStep] = useState(1);

  // Calculus tools (Tangent Line & Definite Integral)
  const [calcFnId, setCalcFnId] = useState(() => functions[0]?.id || 'fn-1');
  const [showTangent, setShowTangent] = useState(false);
  const [tangentX0, setTangentX0] = useState('1');
  const [showIntegral, setShowIntegral] = useState(false);
  const [integralA, setIntegralA] = useState('0');
  const [integralB, setIntegralB] = useState('3');

  // Custom plotted points + connect polygon
  const [customPoints, setCustomPoints] = useState(() =>
    Array.isArray(savedState?.customPoints) ? savedState.customPoints : []
  );
  const [connectPointsMode, setConnectPointsMode] = useState(
    () => savedState?.connectPointsMode || 'none'
  ); // 'none' | 'polyline' | 'polygon'
  const [ptLabel, setPtLabel] = useState('A');
  const [ptX, setPtX] = useState('1');
  const [ptY, setPtY] = useState('2');

  // Detailed explanation state
  const [detailedExplain, setDetailedExplain] = useState(null);
  const [explainedSignature, setExplainedSignature] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [explainCopied, setExplainCopied] = useState(false);

  // Photo-to-Graph scan state
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoScanning, setPhotoScanning] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoMeta, setPhotoMeta] = useState(null);
  const [photoMode, setPhotoMode] = useState('replace'); // 'replace' | 'append'
  const [photoDragActive, setPhotoDragActive] = useState(false);
  const photoCameraInputRef = useRef(null);
  const photoFileInputRef = useRef(null);
  const lastPhotoFileRef = useRef(null);
  const photoPreviewUrlRef = useRef(null);

  // Student improvement request (sent to Telegram Bot)
  const [fbName, setFbName] = useState(defaultStudentName);
  const [fbCategory, setFbCategory] = useState('feature');
  const [fbMessage, setFbMessage] = useState('');
  const [fbAttachEquations, setFbAttachEquations] = useState(true);
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbError, setFbError] = useState('');
  const [fbSuccess, setFbSuccess] = useState(false);

  useEffect(() => {
    if (defaultStudentName) {
      setFbName((prev) => prev || defaultStudentName);
    }
  }, [defaultStudentName]);

  // Canvas & interaction refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const inputRefs = useRef({});
  const [canvasSize, setCanvasSize] = useState({ width: 720, height: 480 });
  const [tracePoint, setTracePoint] = useState(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startCenterX: 0,
    startCenterY: 0,
    pinchDist: null,
    pinchScale: 42,
  });

  // Auto-save graph state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          functions,
          params,
          view,
          showGrid,
          showKeyPoints,
          showAsymptotes,
          piAxis,
          customPoints,
          connectPointsMode,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [functions, params, view, showGrid, showKeyPoints, showAsymptotes, piAxis, customPoints, connectPointsMode]);

  // Compile all entries cleanly
  const compiledFunctions = useMemo(
    () =>
      functions.map((fn, idx) => ({
        ...fn,
        indexLabel: idx + 1,
        compiled: compileGraphEntry(fn.expr),
      })),
    [functions]
  );

  // Explicit single-variable functions eligible for tables, calculus, roots
  const standardFunctions = useMemo(
    () => compiledFunctions.filter((f) => f.compiled.ok && f.compiled.kind === 'function'),
    [compiledFunctions]
  );

  const detectedParams = useMemo(() => {
    const used = new Set();
    for (const item of compiledFunctions) {
      if (item.compiled.ok) {
        item.compiled.usedParams.forEach((p) => used.add(p));
      }
    }
    return Array.from(used);
  }, [compiledFunctions]);

  const showSliders = showSlidersOverride || detectedParams.length > 0;

  const viewport = useMemo(() => {
    const halfW = canvasSize.width / 2 / view.scale;
    const halfH = canvasSize.height / 2 / view.scale;
    return {
      xMin: view.centerX - halfW,
      xMax: view.centerX + halfW,
      yMin: view.centerY - halfH,
      yMax: view.centerY + halfH,
    };
  }, [canvasSize, view]);

  // Feature analysis for visible standard functions
  const analysis = useMemo(() => {
    const visibleStandard = compiledFunctions.filter(
      (f) => f.visible && f.compiled.ok && f.compiled.kind === 'function'
    );
    const perFunction = visibleStandard.map((f) => ({
      id: f.id,
      expr: f.expr,
      color: f.color,
      ...analyzeFunctionFeatures(f.compiled.evaluate, params, viewport),
    }));

    const intersections = [];
    for (let i = 0; i < visibleStandard.length; i += 1) {
      for (let j = i + 1; j < visibleStandard.length; j += 1) {
        const pts = findCurveIntersections(
          visibleStandard[i].compiled.evaluate,
          visibleStandard[j].compiled.evaluate,
          params,
          viewport
        );
        pts.forEach((p) => {
          intersections.push({
            ...p,
            pair: `f${visibleStandard[i].indexLabel} ∩ f${visibleStandard[j].indexLabel}`,
          });
        });
      }
    }

    return { perFunction, intersections };
  }, [compiledFunctions, params, viewport]);

  // Active calculus target function
  const selectedCalcFn =
    standardFunctions.find((f) => f.id === calcFnId) || standardFunctions[0] || null;

  const tangentInfo = useMemo(() => {
    if (!showTangent || !selectedCalcFn) return null;
    if (String(tangentX0).trim() === '') return null;
    const x0 = Number(tangentX0);
    if (!Number.isFinite(x0)) return null;
    const y0 = selectedCalcFn.compiled.evaluate(x0, params);
    const slope = numericDerivative(selectedCalcFn.compiled.evaluate, x0, params);
    if (!Number.isFinite(y0) || !Number.isFinite(slope)) {
      return { valid: false, x0, y0: NaN, slope: NaN, b: NaN };
    }
    const b = y0 - slope * x0;
    return {
      valid: true,
      x0,
      y0,
      slope,
      b,
      equation: formatLinearEquation(slope, b),
      color: selectedCalcFn.color,
    };
  }, [showTangent, selectedCalcFn, tangentX0, params]);

  const integralInfo = useMemo(() => {
    if (!showIntegral || !selectedCalcFn) return null;
    if (String(integralA).trim() === '' || String(integralB).trim() === '') return null;
    const a = Number(integralA);
    const b = Number(integralB);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const res = computeDefiniteIntegral(selectedCalcFn.compiled.evaluate, a, b, params);
    return {
      ...res,
      a,
      b,
      color: selectedCalcFn.color,
      evaluate: selectedCalcFn.compiled.evaluate,
    };
  }, [showIntegral, selectedCalcFn, integralA, integralB, params]);

  const offlineExplanations = useMemo(
    () => buildOfflineGraphExplanation(compiledFunctions, params, viewport, analysis, isKm),
    [compiledFunctions, params, viewport, analysis, isKm]
  );

  const currentGraphSignature = useMemo(
    () =>
      JSON.stringify({
        exprs: compiledFunctions
          .filter((f) => f.visible && f.compiled.ok)
          .map((f) => [f.expr.trim(), f.compiled.kind]),
        params,
        language,
      }),
    [compiledFunctions, params, language]
  );

  const handleExplainGraph = async () => {
    const visibleExprs = compiledFunctions
      .filter((f) => f.visible && f.compiled.ok)
      .map((f) => ({ expr: f.expr.trim(), kind: f.compiled.kind }));

    if (visibleExprs.length === 0) {
      setExplainError(
        isKm ? 'សូមបញ្ចូល និងបើកសមីការយ៉ាងហោចណាស់មួយសិន។' : 'Enable at least one valid equation first.'
      );
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setExplainError(
        isKm
          ? 'មិនមានអ៊ីនធឺណិតទេ — អ្នកអាចមើលការវិភាគភ្លាមៗខាងក្រោម ឬភ្ជាប់អ៊ីនធឺណិតដើម្បីស្នើសុំការពន្យល់លម្អិត។'
          : 'You are offline — instant analysis remains available below; reconnect for detailed explanation.'
      );
      return;
    }

    setExplainLoading(true);
    setExplainError('');

    try {
      const analysisSummary = {
        functions: analysis.perFunction.map((item) => ({
          expr: item.expr,
          yIntercept: item.yIntercept,
          xIntercepts: item.xIntercepts,
          extrema: item.extrema,
          inflectionPoints: item.inflectionPoints,
          verticalAsymptotes: item.verticalAsymptotes,
          horizontalAsymptotes: item.horizontalAsymptotes,
          obliqueAsymptotes: item.obliqueAsymptotes.map((o) => formatLinearEquation(o.m, o.b)),
        })),
        intersections: analysis.intersections,
        tangentLine: tangentInfo?.valid
          ? {
              x0: tangentInfo.x0,
              y0: tangentInfo.y0,
              slope: tangentInfo.slope,
              equation: tangentInfo.equation,
            }
          : null,
        definiteIntegral: integralInfo?.valid
          ? { a: integralInfo.a, b: integralInfo.b, value: integralInfo.value }
          : null,
      };

      const res = await fetch('/api/explain_graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expressions: visibleExprs,
          language,
          params,
          analysisSummary,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            (isKm
              ? 'មិនអាចបង្កើតការពន្យល់លម្អិតបានទេ សូមព្យាយាមម្ដងទៀត!'
              : 'Could not generate detailed explanation.')
        );
      }

      setDetailedExplain(data);
      setExplainedSignature(currentGraphSignature);
    } catch (err) {
      setExplainError(
        err?.message ||
          (isKm ? 'មានបញ្ហាក្នុងការពន្យល់ក្រាហ្វ សូមព្យាយាមម្ដងទៀត!' : 'Failed to explain graph.')
      );
    } finally {
      setExplainLoading(false);
    }
  };

  const handleCopyDetailedExplain = () => {
    if (!detailedExplain) return;
    const textParts = [
      detailedExplain.overview,
      ...(detailedExplain.sections || []).map((s) => `${s.title}\n${s.content}`),
      detailedExplain.study_tip ? `${isKm ? 'គន្លឹះសិក្សា៖' : 'Study Tip:'} ${detailedExplain.study_tip}` : '',
    ].filter(Boolean);
    navigator.clipboard?.writeText(textParts.join('\n\n'));
    setExplainCopied(true);
    setTimeout(() => setExplainCopied(false), 2000);
  };

  const clearPhotoState = useCallback(() => {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = null;
    }
    setPhotoPreview(null);
    setPhotoError('');
    setPhotoMeta(null);
    lastPhotoFileRef.current = null;
    if (photoCameraInputRef.current) photoCameraInputRef.current.value = '';
    if (photoFileInputRef.current) photoFileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
      }
    };
  }, []);

  const processGraphPhoto = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.type?.startsWith('image/')) {
        setPhotoError(
          isKm
            ? 'សូមជ្រើសរើសឯកសាររូបភាព (JPG, PNG, WebP)។'
            : 'Please select a valid image file (JPG, PNG, WebP).'
        );
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setPhotoError(
          isKm
            ? 'ទំហំរូបភាពធំពេក (អតិបរមា 15MB)។ សូមជ្រើសរើសរូបភាពតូចជាងនេះ!'
            : 'Image is too large (max 15MB).'
        );
        return;
      }

      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
      }
      const nextPreviewUrl = URL.createObjectURL(file);
      photoPreviewUrlRef.current = nextPreviewUrl;
      lastPhotoFileRef.current = file;
      setPhotoPreview(nextPreviewUrl);
      setPhotoError('');
      setPhotoMeta(null);
      setDeckTab('functions');

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setPhotoError(
          isKm
            ? 'គ្មានអ៊ីនធឺណិត — សូមភ្ជាប់អ៊ីនធឺណិតដើម្បីស្កេនសមីការពីរូបថត!'
            : 'Offline — please reconnect to scan equations from a photo.'
        );
        return;
      }

      setPhotoScanning(true);
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('language', language);

        const res = await fetch('/api/graph_from_image', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) {
          throw new Error(
            data?.error ||
              (isKm
                ? 'មិនអាចអានសមីការពីរូបភាពបានទេ សូមព្យាយាមម្ដងទៀត!'
                : 'Could not extract equations from this photo.')
          );
        }

        if (!data.is_valid_math) {
          setPhotoError(
            data.rejection_reason ||
              (isKm
                ? 'រកមិនឃើញសមីការ ឬចំណុចគណិតវិទ្យាក្នុងរូបភាពនេះទេ។'
                : 'No plottable math found in this photo.')
          );
          return;
        }

        // Validate every extracted equation against our offline parser
        const validEquations = (Array.isArray(data.equations) ? data.equations : []).filter((eq) => {
          const check = compileGraphEntry(eq?.expr || '');
          return check.ok;
        });

        const validPoints = (Array.isArray(data.points) ? data.points : []).filter(
          (pt) => Number.isFinite(Number(pt?.x)) && Number.isFinite(Number(pt?.y))
        );

        if (validEquations.length === 0 && validPoints.length === 0) {
          setPhotoError(
            isKm
              ? 'រកឃើញខ្លឹមសារគណិតវិទ្យា ប៉ុន្តែមិនអាចបម្លែងជាសមីការសង់ក្រាហ្វបានទេ។ សូមសាកល្បងថតឲ្យច្បាស់ជាងនេះ!'
              : 'Math text detected, but no plottable expression could be parsed.'
          );
          return;
        }

        const nowTs = Date.now();

        if (validEquations.length > 0) {
          if (photoMode === 'append') {
            setFunctions((prev) => {
              const cleanedPrev = prev.filter((f) => f.expr.trim().length > 0);
              const startIdx = cleanedPrev.length;
              const appended = validEquations.map((eq, idx) => ({
                id: `fn-${nowTs}-${idx}`,
                expr: eq.expr,
                color: CURVE_COLORS[(startIdx + idx) % CURVE_COLORS.length],
                visible: true,
                showDerivative: Boolean(eq.show_derivative),
              }));
              const merged = [...cleanedPrev, ...appended];
              if (appended[0]) {
                setActiveFnId(appended[0].id);
                setTableFnId(appended[0].id);
                setCalcFnId(appended[0].id);
              }
              return merged;
            });
          } else {
            const nextFns = validEquations.map((eq, idx) => ({
              id: `fn-${nowTs}-${idx}`,
              expr: eq.expr,
              color: CURVE_COLORS[idx % CURVE_COLORS.length],
              visible: true,
              showDerivative: Boolean(eq.show_derivative),
            }));
            setFunctions(nextFns);
            setActiveFnId(nextFns[0].id);
            setTableFnId(nextFns[0].id);
            setCalcFnId(nextFns[0].id);
          }
        }

        if (validPoints.length > 0) {
          const nextPts = validPoints.map((pt, idx) => ({
            id: `pt-${nowTs}-${idx}`,
            label: pt.label || String.fromCharCode(65 + (idx % 26)),
            x: Number(pt.x),
            y: Number(pt.y),
          }));
          setCustomPoints((prev) => (photoMode === 'append' ? [...prev, ...nextPts] : nextPts));
          if (data.connect_points_mode && data.connect_points_mode !== 'none') {
            setConnectPointsMode(data.connect_points_mode);
          } else if (photoMode === 'replace') {
            setConnectPointsMode('none');
          }
        } else if (photoMode === 'replace') {
          setCustomPoints([]);
          setConnectPointsMode('none');
        }

        if (data.params) {
          setParams({
            a: Number.isFinite(Number(data.params.a)) ? Number(data.params.a) : 1,
            b: Number.isFinite(Number(data.params.b)) ? Number(data.params.b) : 0,
            c: Number.isFinite(Number(data.params.c)) ? Number(data.params.c) : 0,
          });
        }

        setPiAxis(Boolean(data.use_pi_axis));

        if (data.tangent?.enabled) {
          setShowTangent(true);
          setTangentX0(String(data.tangent.x0));
        } else if (photoMode === 'replace') {
          setShowTangent(false);
        }

        if (data.integral?.enabled) {
          setShowIntegral(true);
          setIntegralA(String(data.integral.a));
          setIntegralB(String(data.integral.b));
        } else if (photoMode === 'replace') {
          setShowIntegral(false);
        }

        if (data.suggested_view && photoMode === 'replace') {
          setView({
            centerX: Number(data.suggested_view.centerX) || 0,
            centerY: Number(data.suggested_view.centerY) || 0,
            scale: Math.max(12, Math.min(160, Number(data.suggested_view.scale) || 42)),
          });
        }

        setTracePoint(null);
        setDetailedExplain(null);
        setExplainedSignature('');
        setPhotoMeta({
          summary: data.summary || '',
          equationCount: validEquations.length,
          pointCount: validPoints.length,
          hasTangent: Boolean(data.tangent?.enabled),
          hasIntegral: Boolean(data.integral?.enabled),
        });
      } catch (err) {
        setPhotoError(
          err?.message ||
            (isKm
              ? 'មានបញ្ហាក្នុងការស្កេនរូបភាព សូមព្យាយាមម្ដងទៀត!'
              : 'Failed to scan photo. Please try again.')
        );
      } finally {
        setPhotoScanning(false);
      }
    },
    [isKm, language, photoMode]
  );

  const handlePhotoInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processGraphPhoto(file);
    }
    e.target.value = '';
  };

  const handlePhotoDrop = (e) => {
    e.preventDefault();
    setPhotoDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processGraphPhoto(file);
    }
  };

  // Support Ctrl+V / Cmd+V pasting a screenshot anywhere on the Graphing Lab page
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].type?.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            processGraphPhoto(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [processGraphPhoto]);

  const handleSubmitGraphFeedback = async (e) => {
    e.preventDefault();
    const trimmedMsg = fbMessage.trim();
    if (trimmedMsg.length < 3) {
      setFbError(
        isKm
          ? 'សូមសរសេរសំណើកែសម្រួល ឬមតិយោបល់របស់អ្នកជាមុនសិន។'
          : 'Please enter your suggestion or issue first.'
      );
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setFbError(
        isKm
          ? 'គ្មានអ៊ីនធឺណិត — សូមភ្ជាប់អ៊ីនធឺណិតដើម្បីផ្ញើសំណើ!'
          : 'Offline — please reconnect to send your request.'
      );
      return;
    }

    setFbSubmitting(true);
    setFbError('');
    setFbSuccess(false);

    try {
      const activeExprs = fbAttachEquations
        ? functions.map((f) => f.expr.trim()).filter(Boolean)
        : [];

      const res = await fetch('/api/graph_feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: fbName.trim(),
          studentId: currentUser?.student_id || '',
          category: fbCategory,
          message: trimmedMsg,
          currentEquations: activeExprs,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            (isKm
              ? 'មានបញ្ហាក្នុងការបញ្ជូនសំណើ។ សូមព្យាយាមម្ដងទៀត!'
              : 'Could not submit your request. Please try again.')
        );
      }

      setFbMessage('');
      setFbSuccess(true);
    } catch (err) {
      setFbError(
        err?.message ||
          (isKm
            ? 'មានបញ្ហាក្នុងការបញ្ជូនសំណើ។ សូមព្យាយាមម្ដងទៀត!'
            : 'Failed to submit feedback.')
      );
    } finally {
      setFbSubmitting(false);
    }
  };

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const worldToScreen = useCallback(
    (wx, wy) => ({
      sx: canvasSize.width / 2 + (wx - view.centerX) * view.scale,
      sy: canvasSize.height / 2 - (wy - view.centerY) * view.scale,
    }),
    [canvasSize, view]
  );

  const screenToWorld = useCallback(
    (sx, sy) => ({
      wx: view.centerX + (sx - canvasSize.width / 2) / view.scale,
      wy: view.centerY - (sy - canvasSize.height / 2) / view.scale,
    }),
    [canvasSize, view]
  );

  // Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
    const { width, height } = canvasSize;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. Background (soft marine-teal matching #194350)
    ctx.fillStyle = '#143844';
    ctx.fillRect(0, 0, width, height);

    const xSpan = width / view.scale;
    const ySpan = height / view.scale;
    const xStep = piAxis
      ? getNicePiStep(xSpan, Math.max(5, Math.floor(width / 90)))
      : getNiceGridStep(xSpan, Math.max(6, Math.floor(width / 75)));
    const yStep = getNiceGridStep(ySpan, Math.max(5, Math.floor(height / 75)));

    // 2. Grid lines
    if (showGrid) {
      const minorX = piAxis ? xStep / 2 : xStep / 4;
      const minorY = yStep / 4;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = Math.floor(viewport.xMin / minorX) * minorX; x <= viewport.xMax; x += minorX) {
        const { sx } = worldToScreen(x, 0);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      for (let y = Math.floor(viewport.yMin / minorY) * minorY; y <= viewport.yMax; y += minorY) {
        const { sy } = worldToScreen(0, y);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = Math.floor(viewport.xMin / xStep) * xStep; x <= viewport.xMax; x += xStep) {
        const { sx } = worldToScreen(x, 0);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      for (let y = Math.floor(viewport.yMin / yStep) * yStep; y <= viewport.yMax; y += yStep) {
        const { sy } = worldToScreen(0, y);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();
    }

    // 3. Definite Integral Area Shading
    if (integralInfo && integralInfo.valid && Math.abs(integralInfo.b - integralInfo.a) > 1e-6) {
      const lo = Math.min(integralInfo.a, integralInfo.b);
      const hi = Math.max(integralInfo.a, integralInfo.b);
      const { sx: sLo } = worldToScreen(lo, 0);
      const { sx: sHi } = worldToScreen(hi, 0);
      const originY = worldToScreen(0, 0).sy;

      const clampedLo = Math.max(0, sLo);
      const clampedHi = Math.min(width, sHi);
      if (clampedHi > clampedLo) {
        ctx.save();
        ctx.fillStyle = `${integralInfo.color}33`;
        ctx.beginPath();
        ctx.moveTo(clampedLo, originY);
        for (let sx = clampedLo; sx <= clampedHi; sx += 2) {
          const { wx } = screenToWorld(sx, 0);
          const wy = integralInfo.evaluate(wx, params);
          const { sy } = worldToScreen(wx, Number.isFinite(wy) ? wy : 0);
          ctx.lineTo(sx, Math.max(-height, Math.min(height * 2, sy)));
        }
        const { wx: endWx } = screenToWorld(clampedHi, 0);
        const endWy = integralInfo.evaluate(endWx, params);
        const { sy: endSy } = worldToScreen(endWx, Number.isFinite(endWy) ? endWy : 0);
        ctx.lineTo(clampedHi, Math.max(-height, Math.min(height * 2, endSy)));
        ctx.lineTo(clampedHi, originY);
        ctx.closePath();
        ctx.fill();

        // Vertical bounds x = a, x = b
        ctx.strokeStyle = `${integralInfo.color}AA`;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.25;
        [lo, hi].forEach((boundX) => {
          const boundY = integralInfo.evaluate(boundX, params);
          const { sx: bx, sy: by } = worldToScreen(boundX, Number.isFinite(boundY) ? boundY : 0);
          if (bx >= 0 && bx <= width) {
            ctx.beginPath();
            ctx.moveTo(bx, originY);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        });
        ctx.restore();
      }
    }

    // 4. Shaded Inequalities (y < / <= / > / >= f(x) and F(x, y) inequalities)
    for (const item of compiledFunctions) {
      if (!item.visible || !item.compiled.ok) continue;

      if (item.compiled.kind === 'inequality') {
        const { op, evaluate } = item.compiled;
        const isBelow = op === '<' || op === '<=';
        ctx.save();
        ctx.fillStyle = `${item.color}24`;
        ctx.beginPath();
        let started = false;
        const stepPx = 3;
        for (let sx = 0; sx <= width + stepPx; sx += stepPx) {
          const { wx } = screenToWorld(sx, 0);
          const wy = evaluate(wx, params);
          if (!Number.isFinite(wy)) continue;
          const { sy } = worldToScreen(wx, wy);
          const clampedSy = Math.max(-height, Math.min(height * 2, sy));
          if (!started) {
            ctx.moveTo(sx, isBelow ? height : 0);
            ctx.lineTo(sx, clampedSy);
            started = true;
          } else {
            ctx.lineTo(sx, clampedSy);
          }
        }
        if (started) {
          ctx.lineTo(width, isBelow ? height : 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else if (item.compiled.kind === 'implicitInequality') {
        const { op, evaluateImplicit } = item.compiled;
        const cellPx = 8;
        const cols = Math.ceil(width / cellPx);
        const rows = Math.ceil(height / cellPx);
        ctx.save();
        ctx.fillStyle = `${item.color}24`;
        for (let r = 0; r < rows; r += 1) {
          const sy = (r + 0.5) * cellPx;
          for (let c = 0; c < cols; c += 1) {
            const sx = (c + 0.5) * cellPx;
            const { wx, wy } = screenToWorld(sx, sy);
            const val = evaluateImplicit(wx, wy, params);
            if (!Number.isFinite(val)) continue;
            const match =
              op === '<'
                ? val < 0
                : op === '<='
                ? val <= 0
                : op === '>'
                ? val > 0
                : val >= 0;
            if (match) {
              ctx.fillRect(c * cellPx, r * cellPx, cellPx + 0.5, cellPx + 0.5);
            }
          }
        }
        ctx.restore();
      }
    }

    // 5. Axes + ticks
    const origin = worldToScreen(0, 0);
    const axisColor = 'rgba(255, 255, 255, 0.55)';
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;

    // X axis
    if (origin.sy >= -20 && origin.sy <= height + 20) {
      const clampedY = Math.max(18, Math.min(height - 18, origin.sy));
      const axisOnScreen = origin.sy >= 0 && origin.sy <= height;
      if (axisOnScreen) {
        ctx.beginPath();
        ctx.moveTo(0, origin.sy);
        ctx.lineTo(width - 6, origin.sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width - 2, origin.sy);
        ctx.lineTo(width - 10, origin.sy - 4);
        ctx.lineTo(width - 10, origin.sy + 4);
        ctx.closePath();
        ctx.fillStyle = axisColor;
        ctx.fill();
      }

      ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.textAlign = 'center';
      ctx.textBaseline = axisOnScreen && origin.sy > height - 28 ? 'bottom' : 'top';
      const labelY = axisOnScreen
        ? origin.sy > height - 28
          ? origin.sy - 6
          : origin.sy + 6
        : clampedY;

      for (let x = Math.floor(viewport.xMin / xStep) * xStep; x <= viewport.xMax; x += xStep) {
        if (Math.abs(x) < xStep * 0.001) continue;
        const { sx } = worldToScreen(x, 0);
        if (sx < 22 || sx > width - 22) continue;
        if (axisOnScreen) {
          ctx.beginPath();
          ctx.moveTo(sx, origin.sy - 3);
          ctx.lineTo(sx, origin.sy + 3);
          ctx.stroke();
        }
        ctx.fillText(piAxis ? formatPiTick(x) : formatAxisTick(x, xStep), sx, labelY);
      }
      if (axisOnScreen) {
        ctx.font = 'italic 600 12px Georgia, serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('x', width - 10, origin.sy - 7);
      }
    }

    // Y axis
    if (origin.sx >= -20 && origin.sx <= width + 20) {
      const axisOnScreen = origin.sx >= 0 && origin.sx <= width;
      if (axisOnScreen) {
        ctx.strokeStyle = axisColor;
        ctx.beginPath();
        ctx.moveTo(origin.sx, height);
        ctx.lineTo(origin.sx, 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(origin.sx, 2);
        ctx.lineTo(origin.sx - 4, 10);
        ctx.lineTo(origin.sx + 4, 10);
        ctx.closePath();
        ctx.fillStyle = axisColor;
        ctx.fill();
      }

      ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      const alignRight = axisOnScreen && origin.sx < 36;
      ctx.textAlign = alignRight ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      const labelX = axisOnScreen
        ? alignRight
          ? origin.sx + 7
          : origin.sx - 7
        : Math.max(8, Math.min(width - 28, origin.sx));

      for (let y = Math.floor(viewport.yMin / yStep) * yStep; y <= viewport.yMax; y += yStep) {
        if (Math.abs(y) < yStep * 0.001) continue;
        const { sy } = worldToScreen(0, y);
        if (sy < 18 || sy > height - 18) continue;
        if (axisOnScreen) {
          ctx.beginPath();
          ctx.moveTo(origin.sx - 3, sy);
          ctx.lineTo(origin.sx + 3, sy);
          ctx.stroke();
        }
        ctx.fillText(formatAxisTick(y, yStep), labelX, sy);
      }

      if (axisOnScreen) {
        ctx.font = 'italic 600 12px Georgia, serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('y', origin.sx + 8, 8);
      }
    }

    if (origin.sx >= 16 && origin.sx <= width - 12 && origin.sy >= 12 && origin.sy <= height - 16) {
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('O', origin.sx - 6, origin.sy + 5);
    }

    // 6. Asymptotes (Vertical, Horizontal, and Oblique Slant Asymptotes)
    if (showAsymptotes) {
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.25;
      ctx.font = '600 11px ui-monospace, monospace';

      for (const item of analysis.perFunction) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.62)';
        ctx.fillStyle = '#FBBF24';

        for (const vx of item.verticalAsymptotes) {
          const { sx } = worldToScreen(vx, 0);
          if (sx >= 0 && sx <= width) {
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, height);
            ctx.stroke();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`x = ${formatCoordNumber(vx)}`, Math.min(width - 60, sx + 5), 10);
          }
        }

        for (const hy of item.horizontalAsymptotes) {
          const { sy } = worldToScreen(0, hy);
          if (sy >= 0 && sy <= height) {
            ctx.beginPath();
            ctx.moveTo(0, sy);
            ctx.lineTo(width, sy);
            ctx.stroke();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`y = ${formatCoordNumber(hy)}`, 10, Math.max(18, sy - 4));
          }
        }

        for (const obl of item.obliqueAsymptotes) {
          const yAtMin = obl.m * viewport.xMin + obl.b;
          const yAtMax = obl.m * viewport.xMax + obl.b;
          const p1 = worldToScreen(viewport.xMin, yAtMin);
          const p2 = worldToScreen(viewport.xMax, yAtMax);
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();

          // Place equation label cleanly inside canvas
          const labelWx = viewport.xMin + xSpan * 0.72;
          const labelWy = obl.m * labelWx + obl.b;
          const lp = worldToScreen(labelWx, labelWy);
          if (lp.sy > 20 && lp.sy < height - 20) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(formatLinearEquation(obl.m, obl.b), Math.min(width - 95, lp.sx), lp.sy - 5);
          }
        }
      }
      ctx.restore();
    }

    // 7. Function Curves, Vertical Lines, Implicit Conics & Derivative Curves
    const sampleStepPx = 1.5;
    const drawExplicitCurve = (evalFn, color, lineWidth = 2.5, dashed = false) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (dashed) ctx.setLineDash([6, 5]);

      let penDown = false;
      let prevSy = null;
      let prevWy = null;

      ctx.beginPath();
      for (let sx = 0; sx <= width + sampleStepPx; sx += sampleStepPx) {
        const { wx } = screenToWorld(sx, 0);
        const wy = evalFn(wx);

        if (!Number.isFinite(wy)) {
          if (penDown) {
            ctx.stroke();
            ctx.beginPath();
            penDown = false;
          }
          prevSy = null;
          prevWy = null;
          continue;
        }

        const { sy } = worldToScreen(wx, wy);
        const isJump =
          prevSy !== null &&
          (Math.abs(sy - prevSy) > height * 0.72 ||
            (prevWy !== null &&
              ((prevWy > 0 && wy < 0) || (prevWy < 0 && wy > 0)) &&
              Math.abs(sy - prevSy) > height * 0.35));

        const clampedSy = Math.max(-height * 2, Math.min(height * 3, sy));

        if (!penDown || isJump) {
          if (penDown && isJump) {
            ctx.stroke();
            ctx.beginPath();
          }
          ctx.moveTo(sx, clampedSy);
          penDown = true;
        } else {
          ctx.lineTo(sx, clampedSy);
        }

        prevSy = sy;
        prevWy = wy;
      }
      if (penDown) ctx.stroke();
      ctx.restore();
    };

    for (const item of compiledFunctions) {
      if (!item.visible || !item.compiled.ok) continue;

      if (item.compiled.kind === 'function' || item.compiled.kind === 'inequality') {
        drawExplicitCurve(
          (wx) => item.compiled.evaluate(wx, params),
          item.color,
          2.5,
          Boolean(item.compiled.strict)
        );
        if (item.showDerivative && item.compiled.kind === 'function') {
          drawExplicitCurve(
            (wx) => numericDerivative(item.compiled.evaluate, wx, params),
            `${item.color}BB`,
            1.75,
            true
          );
        }
      } else if (item.compiled.kind === 'vertical') {
        const vx = item.compiled.evaluateX(params);
        if (Number.isFinite(vx)) {
          const { sx } = worldToScreen(vx, 0);
          if (sx >= -4 && sx <= width + 4) {
            ctx.save();
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, height);
            ctx.stroke();
            ctx.restore();
          }
        }
      } else if (item.compiled.kind === 'implicit' || item.compiled.kind === 'implicitInequality') {
        const segments = computeImplicitContours(item.compiled.evaluateImplicit, params, viewport);
        ctx.save();
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        if (item.compiled.strict) ctx.setLineDash([6, 5]);
        ctx.beginPath();
        for (const [p1, p2] of segments) {
          const s1 = worldToScreen(p1.x, p1.y);
          const s2 = worldToScreen(p2.x, p2.y);
          ctx.moveTo(s1.sx, s1.sy);
          ctx.lineTo(s2.sx, s2.sy);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // 8. Tangent Line Overlay at x0
    if (tangentInfo && tangentInfo.valid) {
      const yLeft = tangentInfo.slope * viewport.xMin + tangentInfo.b;
      const yRight = tangentInfo.slope * viewport.xMax + tangentInfo.b;
      if (Number.isFinite(yLeft) && Number.isFinite(yRight)) {
        ctx.save();
        ctx.strokeStyle = '#FFFFFFCC';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([7, 4]);
        const p1 = worldToScreen(viewport.xMin, yLeft);
        const p2 = worldToScreen(viewport.xMax, yRight);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
        ctx.restore();
      }
    }

    const drawMarkerDot = (wx, wy, fill, stroke = '#143844', radius = 4.5, label = null) => {
      const { sx, sy } = worldToScreen(wx, wy);
      if (sx < -10 || sx > width + 10 || sy < -10 || sy > height + 10) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1.75;
      ctx.strokeStyle = stroke;
      ctx.stroke();
      if (label) {
        ctx.font = '600 11px ui-monospace, monospace';
        const metrics = ctx.measureText(label);
        const padX = 5;
        const bx = Math.min(width - metrics.width - padX * 2 - 4, sx + 8);
        const by = Math.max(4, sy - 22);
        ctx.fillStyle = 'rgba(20, 56, 68, 0.92)';
        ctx.beginPath();
        ctx.roundRect(bx, by, metrics.width + padX * 2, 18, 5);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx + padX, by + 9);
      }
      ctx.restore();
    };

    if (tangentInfo && tangentInfo.valid) {
      drawMarkerDot(
        tangentInfo.x0,
        tangentInfo.y0,
        '#FFFFFF',
        tangentInfo.color,
        5.5,
        `(${formatCoordNumber(tangentInfo.x0)}, ${formatCoordNumber(tangentInfo.y0)})`
      );
    }

    // 9. Key Points (Roots, Intercepts, Extrema, Inflection Points, Intersections)
    if (showKeyPoints) {
      for (const item of analysis.perFunction) {
        if (item.yIntercept) {
          drawMarkerDot(item.yIntercept.x, item.yIntercept.y, item.color, '#FFFFFF', 4.5);
        }
        item.xIntercepts.forEach((pt) => {
          drawMarkerDot(pt.x, pt.y, item.color, '#FFFFFF', 4.5);
        });
        item.extrema.forEach((pt) => {
          drawMarkerDot(pt.x, pt.y, '#FBBF24', '#143844', 5);
        });
        item.inflectionPoints.forEach((pt) => {
          drawMarkerDot(pt.x, pt.y, '#A78BFA', '#FFFFFF', 4.5);
        });
      }
      analysis.intersections.forEach((pt) => {
        drawMarkerDot(pt.x, pt.y, '#FFFFFF', '#143844', 5.2);
      });
    }

    // 10. Connect Custom Points (Geometry Polyline / Polygon) + Point Dots
    if (customPoints.length >= 2 && connectPointsMode !== 'none') {
      ctx.save();
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      customPoints.forEach((pt, idx) => {
        const { sx, sy } = worldToScreen(pt.x, pt.y);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      if (connectPointsMode === 'polygon' && customPoints.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(52, 211, 153, 0.14)';
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();
    }

    customPoints.forEach((pt) => {
      const coordLabel = `${pt.label ? `${pt.label}` : ''}(${formatCoordNumber(pt.x)}, ${formatCoordNumber(pt.y)})`;
      drawMarkerDot(pt.x, pt.y, '#34D399', '#FFFFFF', 5.5, coordLabel);
    });

    // 11. Trace Crosshair
    if (tracePoint) {
      const { sx, sy } = worldToScreen(tracePoint.x, tracePoint.y);
      if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
        ctx.restore();

        drawMarkerDot(tracePoint.x, tracePoint.y, tracePoint.color, '#FFFFFF', 6);
      }
    }
  }, [
    canvasSize,
    view,
    viewport,
    showGrid,
    piAxis,
    showAsymptotes,
    showKeyPoints,
    compiledFunctions,
    params,
    analysis,
    tangentInfo,
    integralInfo,
    customPoints,
    connectPointsMode,
    tracePoint,
    worldToScreen,
    screenToWorld,
  ]);

  // Hover / Tap trace
  const updateTraceAtScreenPos = useCallback(
    (sx, sy) => {
      const { wx, wy: cursorWy } = screenToWorld(sx, sy);
      let best = null;
      let bestDistPx = 28;

      for (const item of compiledFunctions) {
        if (!item.visible || !item.compiled.ok) continue;

        if (item.compiled.kind === 'function' || item.compiled.kind === 'inequality') {
          const wy = item.compiled.evaluate(wx, params);
          if (!Number.isFinite(wy)) continue;
          const { sy: curveSy } = worldToScreen(wx, wy);
          const dist = Math.abs(curveSy - sy);
          if (dist < bestDistPx) {
            bestDistPx = dist;
            const slope =
              item.compiled.kind === 'function'
                ? numericDerivative(item.compiled.evaluate, wx, params)
                : NaN;
            best = { x: wx, y: wy, slope, fnId: item.id, color: item.color };
          }
        } else if (item.compiled.kind === 'vertical') {
          const vx = item.compiled.evaluateX(params);
          if (!Number.isFinite(vx)) continue;
          const { sx: lineSx } = worldToScreen(vx, cursorWy);
          const dist = Math.abs(lineSx - sx);
          if (dist < bestDistPx) {
            bestDistPx = dist;
            best = { x: vx, y: cursorWy, slope: NaN, fnId: item.id, color: item.color };
          }
        } else if (
          item.compiled.kind === 'implicit' ||
          item.compiled.kind === 'implicitInequality'
        ) {
          const spanWorld = 24 / view.scale;
          const steps = 16;
          const dy = (spanWorld * 2) / steps;
          let prevY = cursorWy - spanWorld;
          let prevV = item.compiled.evaluateImplicit(wx, prevY, params);
          for (let s = 1; s <= steps; s += 1) {
            const curY = cursorWy - spanWorld + s * dy;
            const curV = item.compiled.evaluateImplicit(wx, curY, params);
            if (
              Number.isFinite(prevV) &&
              Number.isFinite(curV) &&
              ((prevV <= 0 && curV >= 0) || (prevV >= 0 && curV <= 0)) &&
              Math.abs(curV - prevV) < 200
            ) {
              const denom = prevV - curV;
              const t = Math.abs(denom) < 1e-12 ? 0.5 : Math.max(0, Math.min(1, prevV / denom));
              const rootY = prevY + t * (curY - prevY);
              const { sy: curveSy } = worldToScreen(wx, rootY);
              const dist = Math.abs(curveSy - sy);
              if (dist < bestDistPx) {
                bestDistPx = dist;
                best = { x: wx, y: rootY, slope: NaN, fnId: item.id, color: item.color };
              }
            }
            prevY = curY;
            prevV = curV;
          }
        }
      }
      setTracePoint(best);
    },
    [compiledFunctions, params, screenToWorld, worldToScreen, view.scale]
  );

  // Mouse handlers
  const handleMouseDown = (e) => {
    dragRef.current = {
      ...dragRef.current,
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startCenterX: view.centerX,
      startCenterY: view.centerY,
    };
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setView((prev) => ({
        ...prev,
        centerX: dragRef.current.startCenterX - dx / prev.scale,
        centerY: dragRef.current.startCenterY + dy / prev.scale,
      }));
      setTracePoint(null);
      return;
    }

    updateTraceAtScreenPos(sx, sy);
  };

  const handleMouseUp = () => {
    dragRef.current.active = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;

    setView((prev) => {
      const nextScale = Math.max(8, Math.min(320, prev.scale * factor));
      const worldX = prev.centerX + (sx - canvasSize.width / 2) / prev.scale;
      const worldY = prev.centerY - (sy - canvasSize.height / 2) / prev.scale;
      return {
        scale: nextScale,
        centerX: worldX - (sx - canvasSize.width / 2) / nextScale,
        centerY: worldY + (sy - canvasSize.height / 2) / nextScale,
      };
    });
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragRef.current = {
        ...dragRef.current,
        active: true,
        startX: t.clientX,
        startY: t.clientY,
        startCenterX: view.centerX,
        startCenterY: view.centerY,
        pinchDist: null,
      };
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        updateTraceAtScreenPos(t.clientX - rect.left, t.clientY - rect.top);
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      dragRef.current = {
        ...dragRef.current,
        active: false,
        pinchDist: Math.hypot(dx, dy),
        pinchScale: view.scale,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && dragRef.current.active) {
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;
      setView((prev) => ({
        ...prev,
        centerX: dragRef.current.startCenterX - dx / prev.scale,
        centerY: dragRef.current.startCenterY + dy / prev.scale,
      }));
    } else if (e.touches.length === 2 && dragRef.current.pinchDist) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / dragRef.current.pinchDist;
      const nextScale = Math.max(8, Math.min(320, dragRef.current.pinchScale * ratio));
      setView((prev) => ({ ...prev, scale: nextScale }));
    }
  };

  const handleTouchEnd = () => {
    dragRef.current.active = false;
    dragRef.current.pinchDist = null;
  };

  // Actions
  const handleZoom = (factor) => {
    setView((prev) => ({
      ...prev,
      scale: Math.max(8, Math.min(320, prev.scale * factor)),
    }));
  };

  const handleResetView = () => {
    setView({ centerX: 0, centerY: 0, scale: 42 });
    setTracePoint(null);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `wsd-graph-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleAddFunction = () => {
    const nextColor = CURVE_COLORS[functions.length % CURVE_COLORS.length];
    const nextId = `fn-${Date.now()}`;
    setFunctions((prev) => [
      ...prev,
      { id: nextId, expr: '', color: nextColor, visible: true, showDerivative: false },
    ]);
    setActiveFnId(nextId);
  };

  const handleUpdateExpr = (id, expr) => {
    setFunctions((prev) => prev.map((f) => (f.id === id ? { ...f, expr } : f)));
  };

  const handleToggleVisibility = (id) => {
    setFunctions((prev) => prev.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f)));
  };

  const handleToggleDerivative = (id) => {
    setFunctions((prev) =>
      prev.map((f) => (f.id === id ? { ...f, showDerivative: !f.showDerivative } : f))
    );
  };

  const handleRemoveFunction = (id) => {
    setFunctions((prev) => {
      if (prev.length <= 1) {
        return [{ ...prev[0], expr: '', showDerivative: false }];
      }
      const next = prev.filter((f) => f.id !== id);
      if (activeFnId === id && next[0]) setActiveFnId(next[0].id);
      if (tableFnId === id && next[0]) setTableFnId(next[0].id);
      if (calcFnId === id && next[0]) setCalcFnId(next[0].id);
      return next;
    });
  };

  const getActiveInputContext = () => {
    const targetId = activeFnId || functions[0]?.id;
    if (!targetId) return null;
    const inputEl = inputRefs.current[targetId] || null;
    const fnObj = functions.find((f) => f.id === targetId);
    const currentVal = fnObj?.expr || '';
    return { targetId, inputEl, currentVal };
  };

  const handleInsertKeypad = (token) => {
    const ctx = getActiveInputContext();
    if (!ctx) return;
    const { targetId, inputEl, currentVal } = ctx;

    if (inputEl && typeof inputEl.selectionStart === 'number') {
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd ?? start;
      const selected = currentVal.slice(start, end);

      let inserted = token;
      let cursorOffset = token.length;

      if (token.endsWith('()')) {
        const fnPrefix = token.slice(0, -1); // e.g. 'sin('
        if (selected.length > 0) {
          inserted = `${fnPrefix}${selected})`;
          cursorOffset = inserted.length;
        } else {
          cursorOffset = token.length - 1;
        }
      }

      const nextVal = currentVal.slice(0, start) + inserted + currentVal.slice(end);
      handleUpdateExpr(targetId, nextVal);
      requestAnimationFrame(() => {
        inputEl.focus();
        const pos = start + cursorOffset;
        inputEl.setSelectionRange(pos, pos);
      });
    } else {
      handleUpdateExpr(targetId, currentVal + token);
    }
  };

  const handleKeypadBackspace = () => {
    const ctx = getActiveInputContext();
    if (!ctx) return;
    const { targetId, inputEl, currentVal } = ctx;
    if (!currentVal) {
      inputEl?.focus();
      return;
    }

    if (inputEl && typeof inputEl.selectionStart === 'number') {
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd ?? start;

      if (start !== end) {
        const nextVal = currentVal.slice(0, start) + currentVal.slice(end);
        handleUpdateExpr(targetId, nextVal);
        requestAnimationFrame(() => {
          inputEl.focus();
          inputEl.setSelectionRange(start, start);
        });
        return;
      }

      if (start === 0) {
        inputEl.focus();
        return;
      }

      const before = currentVal.slice(0, start);
      const after = currentVal.slice(start);
      const matchedToken = SMART_BACKSPACE_TOKENS.find((tk) => before.endsWith(tk));
      const deleteLen = matchedToken ? matchedToken.length : 1;
      const removeTrailingCloseParen =
        ((matchedToken && matchedToken.endsWith('(')) || before.endsWith('(')) &&
        after.startsWith(')');

      const nextStart = start - deleteLen;
      const nextVal =
        currentVal.slice(0, nextStart) +
        (removeTrailingCloseParen ? after.slice(1) : after);

      handleUpdateExpr(targetId, nextVal);
      requestAnimationFrame(() => {
        inputEl.focus();
        inputEl.setSelectionRange(nextStart, nextStart);
      });
    } else {
      handleUpdateExpr(targetId, currentVal.slice(0, -1));
    }
  };

  const handleKeypadMoveCursor = (delta) => {
    const ctx = getActiveInputContext();
    if (!ctx?.inputEl) return;
    const { inputEl, currentVal } = ctx;
    inputEl.focus();
    const cur =
      typeof inputEl.selectionStart === 'number' ? inputEl.selectionStart : currentVal.length;
    const nextPos = Math.max(0, Math.min(currentVal.length, cur + delta));
    requestAnimationFrame(() => {
      inputEl.focus();
      inputEl.setSelectionRange(nextPos, nextPos);
    });
  };

  const handleKeypadClear = () => {
    const ctx = getActiveInputContext();
    if (!ctx) return;
    handleUpdateExpr(ctx.targetId, '');
    requestAnimationFrame(() => {
      ctx.inputEl?.focus();
    });
  };

  const handleApplyPreset = (preset) => {
    const nextFns = preset.items.map((item, idx) => ({
      id: `fn-${Date.now()}-${idx}`,
      expr: item.expr,
      color: item.color,
      visible: true,
      showDerivative: false,
    }));
    setFunctions(nextFns);
    if (nextFns[0]) {
      setActiveFnId(nextFns[0].id);
      setTableFnId(nextFns[0].id);
      setCalcFnId(nextFns[0].id);
    }
    if (preset.params) {
      setParams(preset.params);
    }
    setPiAxis(Boolean(preset.piAxis));
    setShowTangent(false);
    setShowIntegral(false);
    handleResetView();
  };

  const handleAddCustomPoint = (e) => {
    e.preventDefault();
    const xVal = Number(ptX);
    const yVal = Number(ptY);
    if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) return;
    setCustomPoints((prev) => [
      ...prev,
      { id: `pt-${Date.now()}`, label: ptLabel.trim(), x: xVal, y: yVal },
    ]);
    if (/^[A-Z]$/.test(ptLabel.trim())) {
      const code = ptLabel.trim().charCodeAt(0);
      setPtLabel(code < 90 ? String.fromCharCode(code + 1) : 'P');
    }
  };

  // Value table rows for selected function
  const selectedTableFn =
    standardFunctions.find((f) => f.id === tableFnId) || standardFunctions[0] || null;

  const tableRows = useMemo(() => {
    if (!selectedTableFn) return [];
    if (String(tableStart).trim() === '' || String(tableEnd).trim() === '') return [];
    const step = Number(tableStep) > 0 ? Number(tableStep) : 1;
    const start = Number(tableStart);
    const end = Number(tableEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];

    const rows = [];
    const maxRows = 41;
    for (let x = start, count = 0; x <= end + 1e-9 && count < maxRows; x += step, count += 1) {
      const cleanX = Math.round(x * 1000) / 1000;
      const y = selectedTableFn.compiled.evaluate(cleanX, params);
      const dy = Number.isFinite(y)
        ? numericDerivative(selectedTableFn.compiled.evaluate, cleanX, params)
        : NaN;
      rows.push({ x: cleanX, y, dy });
    }
    return rows;
  }, [selectedTableFn, tableStart, tableEnd, tableStep, params]);

  return (
    <div id="graph-page" className="space-y-5 font-kh-body pb-8">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <Link
            to="/more"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-[#38BDF8] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isKm ? 'ត្រឡប់ទៅ ច្រើនទៀត' : 'Back to More'}</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 text-white/90 inline-flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-kh-title text-xl sm:text-2xl text-white">
                {isKm ? 'មន្ទីរពិសោធន៍គូសក្រាហ្វ' : 'Graphing Lab'}
              </h1>
              <p className="text-xs text-white/65">
                {isKm
                  ? 'គូសអនុគមន៍ មើលអាស៊ីមតូត ចំណុចពិសេស និងតារាងតម្លៃ'
                  : 'Plot functions, asymptotes, key points, and value tables'}
              </p>
            </div>
          </div>
        </div>

        {/* Canvas View Toggles & Export (Single Horizontal Row with Short Labels) */}
        <div className="w-full sm:w-auto overflow-x-auto py-0.5 shrink-0">
          <div className="inline-flex items-center flex-nowrap gap-1.5 sm:gap-2 min-w-max">
            <button
              type="button"
              onClick={() => setShowGrid((v) => !v)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                showGrid
                  ? 'bg-white/[0.13] border-white/25 text-white'
                  : 'bg-white/[0.04] border-white/10 text-white/60 hover:bg-white/[0.09] hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5 shrink-0" />
              <span>{isKm ? 'ក្រឡា' : 'Grid'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowKeyPoints((v) => !v)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                showKeyPoints
                  ? 'bg-white/[0.13] border-white/25 text-white'
                  : 'bg-white/[0.04] border-white/10 text-white/60 hover:bg-white/[0.09] hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 shrink-0" />
              <span>{isKm ? 'ចំណុច' : 'Points'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAsymptotes((v) => !v)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                showAsymptotes
                  ? 'bg-white/[0.13] border-white/25 text-white'
                  : 'bg-white/[0.04] border-white/10 text-white/60 hover:bg-white/[0.09] hover:text-white'
              }`}
            >
              {isKm ? 'អាស៊ីមតូត' : 'Asymp.'}
            </button>

            <button
              type="button"
              onClick={() => setPiAxis((v) => !v)}
              title={isKm ? 'ប្ដូរមាត្រដ្ឋានអ័ក្ស Ox ជា π' : 'Toggle π X-axis scale'}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 font-mono ${
                piAxis
                  ? 'bg-white/[0.13] border-white/25 text-white'
                  : 'bg-white/[0.04] border-white/10 text-white/60 hover:bg-white/[0.09] hover:text-white'
              }`}
            >
              π
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.13] border border-white/12 text-white/90 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>PNG</span>
            </button>
          </div>
        </div>
      </header>

      {/* Two-Zone Sandbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Top Zone: Interactive Coordinate Canvas (8 cols on desktop) */}
        <section className="lg:col-span-8 space-y-3">
          <div
            ref={containerRef}
            className="relative w-full h-[360px] sm:h-[460px] lg:h-[560px] rounded-2xl border border-white/12 bg-[#143844] overflow-hidden shadow-sm select-none"
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                handleMouseUp();
                setTracePoint(null);
              }}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
            />

            {/* Top-left Trace Readout HUD */}
            <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2">
              {tracePoint ? (
                <div className="px-3 py-1.5 rounded-xl bg-[#194350]/90 border border-white/15 backdrop-blur-sm text-xs font-mono text-white flex items-center gap-2 shadow-sm tabular-nums">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tracePoint.color }}
                  />
                  <span>
                    ({formatCoordNumber(tracePoint.x)}, {formatCoordNumber(tracePoint.y)})
                  </span>
                  {Number.isFinite(tracePoint.slope) && (
                    <span className="text-white/65 border-l border-white/15 pl-2">
                      f&apos;={formatCoordNumber(tracePoint.slope)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-lg bg-[#194350]/75 border border-white/10 text-[11px] text-white/75 backdrop-blur-sm">
                  {isKm
                    ? 'អូសដើម្បីរំកិល · ចង្អុលលើខ្សែកោងដើម្បីមើលកូអរដោណេ'
                    : 'Drag to pan · Hover curve for coordinates'}
                </div>
              )}
            </div>

            {/* Bottom-right Zoom & Center Controls */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => handleZoom(1.25)}
                title={isKm ? 'ពង្រីក' : 'Zoom In'}
                aria-label={isKm ? 'ពង្រីក' : 'Zoom In'}
                className="w-9 h-9 rounded-xl bg-[#194350]/85 hover:bg-white/[0.14] border border-white/15 text-white/90 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(0.8)}
                title={isKm ? 'បង្រួម' : 'Zoom Out'}
                aria-label={isKm ? 'បង្រួម' : 'Zoom Out'}
                className="w-9 h-9 rounded-xl bg-[#194350]/85 hover:bg-white/[0.14] border border-white/15 text-white/90 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetView}
                title={isKm ? 'ត្រឡប់ទៅគល់ O(0,0)' : 'Reset View'}
                aria-label={isKm ? 'ត្រឡប់ទៅគល់ O(0,0)' : 'Reset View'}
                className="w-9 h-9 rounded-xl bg-[#194350]/85 hover:bg-white/[0.14] border border-white/15 text-white/90 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preset Curriculum Bar (Single Horizontal Row) */}
          <div className="w-full overflow-x-auto py-0.5">
            <div className="inline-flex items-center flex-nowrap gap-2 min-w-max">
              <span className="text-xs font-semibold text-white/70 mr-1 whitespace-nowrap shrink-0">
                {isKm ? 'គំរូមេរៀន៖' : 'Presets:'}
              </span>
              {CURRICULUM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.13] border border-white/10 text-xs text-white/90 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isKm ? preset.labelKm : preset.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Graph Explanation Panel (Live Mathematical Breakdown + On-Demand Detailed Study Guide) */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 text-white/90 inline-flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {isKm ? 'ការពន្យល់ក្រាហ្វ' : 'Graph Explanation'}
                  </h2>
                  <p className="text-[11px] text-white/60">
                    {isKm
                      ? 'បកស្រាយលក្ខណៈខ្សែកោង ទិសដៅប្រែប្រួល និងអាស៊ីមតូត'
                      : 'Curve behavior, variation intervals, and asymptote interpretation'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExplainGraph}
                disabled={explainLoading || offlineExplanations.length === 0}
                className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-45 border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {explainLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <BookOpen className="w-3.5 h-3.5" />
                )}
                <span>
                  {explainLoading
                    ? isKm
                      ? 'កំពុងពន្យល់...'
                      : 'Explaining...'
                    : detailedExplain
                    ? isKm
                      ? 'ពន្យល់លម្អិតម្ដងទៀត'
                      : 'Refresh Detailed Guide'
                    : isKm
                    ? 'ពន្យល់លម្អិត'
                    : 'Explain in Detail'}
                </span>
              </button>
            </div>

            {/* Instant Live Breakdown */}
            {offlineExplanations.length === 0 ? (
              <p className="text-xs text-white/60">
                {isKm
                  ? 'សូមបញ្ចូល ឬបើកខ្សែកោងយ៉ាងហោចណាស់មួយដើម្បីមើលការពន្យល់។'
                  : 'Enter or enable at least one equation to see its explanation.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {offlineExplanations.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-[#143844]/75 border border-white/10 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-mono font-semibold text-white truncate">
                          {item.expr}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-white/[0.07] border border-white/10 text-[10px] font-semibold text-white/85 shrink-0">
                        {item.typeLabel}
                      </span>
                    </div>

                    <ul className="space-y-1 text-xs text-white/80 leading-relaxed">
                      {item.bullets.map((line, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-white/45 mt-0.5">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Active Intersections / Tangent / Integral Context Note */}
            {(analysis.intersections.length > 0 || tangentInfo?.valid || integralInfo?.valid) && (
              <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2 text-xs text-white/80 space-y-1">
                {analysis.intersections.length > 0 && (
                  <p>
                    <span className="font-semibold text-white">
                      {isKm ? 'ចំណុចប្រសព្វ៖ ' : 'Intersections: '}
                    </span>
                    <span className="font-mono">
                      {analysis.intersections
                        .map((p) => `(${formatCoordNumber(p.x)}, ${formatCoordNumber(p.y)})`)
                        .join(', ')}
                    </span>
                    <span className="text-white/65">
                      {isKm ? ' — គឺជាចម្លើយរួមនៃប្រព័ន្ធសមីការលើក្រាហ្វ។' : ' — simultaneous solutions.'}
                    </span>
                  </p>
                )}
                {tangentInfo?.valid && (
                  <p>
                    <span className="font-semibold text-white">
                      {isKm ? 'បន្ទាត់ប៉ះ៖ ' : 'Tangent: '}
                    </span>
                    <span className="font-mono">{tangentInfo.equation}</span>
                    <span className="text-white/65">
                      {isKm
                        ? ` ត្រង់ x₀ = ${formatCoordNumber(tangentInfo.x0)} (មេគុណប្រាប់ទិស f' = ${formatCoordNumber(tangentInfo.slope)})`
                        : ` at x₀ = ${formatCoordNumber(tangentInfo.x0)} (slope = ${formatCoordNumber(tangentInfo.slope)})`}
                    </span>
                  </p>
                )}
                {integralInfo?.valid && (
                  <p>
                    <span className="font-semibold text-white">
                      {isKm ? 'អាំងតេក្រាលកំណត់៖ ' : 'Definite Integral: '}
                    </span>
                    <span className="font-mono">
                      ∫[{formatCoordNumber(integralInfo.a)}, {formatCoordNumber(integralInfo.b)}] f(x)dx ={' '}
                      {formatCoordNumber(integralInfo.value)}
                    </span>
                    <span className="text-white/65">
                      {isKm
                        ? ' (ផលសងផ្ទៃខាងលើ និងខាងក្រោមអ័ក្ស Ox)។'
                        : ' (signed area between curve and x-axis).'}
                    </span>
                  </p>
                )}
              </div>
            )}

            {explainError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-400/25 px-3 py-2 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{explainError}</span>
              </div>
            )}

            {/* Detailed Step-by-Step Pedagogical Guide */}
            {detailedExplain && (
              <div className="rounded-xl bg-[#143844]/90 border border-white/15 p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {isKm ? 'ការបកស្រាយលម្អិតតាមជំហាន' : 'Detailed Step-by-Step Study Guide'}
                    </span>
                    {explainedSignature && explainedSignature !== currentGraphSignature && (
                      <span className="text-[10px] text-amber-200 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-md">
                        {isKm ? 'សមីការបានផ្លាស់ប្ដូរ' : 'Equations changed'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDetailedExplain}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] text-white/85 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {explainCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{explainCopied ? (isKm ? 'បានចម្លង' : 'Copied') : isKm ? 'ចម្លង' : 'Copy'}</span>
                  </button>
                </div>

                {detailedExplain.overview && (
                  <div className="text-xs sm:text-sm text-white/90 leading-relaxed prose prose-invert prose-sm max-w-none">
                    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {detailedExplain.overview}
                    </Markdown>
                  </div>
                )}

                <div className="space-y-2.5">
                  {(detailedExplain.sections || []).map((sec, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-white/[0.04] border border-white/10 p-3 space-y-1.5"
                    >
                      <h3 className="text-xs font-bold text-white">{sec.title}</h3>
                      <div className="text-xs sm:text-sm text-white/85 leading-relaxed prose prose-invert prose-sm max-w-none overflow-x-auto">
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {sec.content}
                        </Markdown>
                      </div>
                    </div>
                  ))}
                </div>

                {detailedExplain.study_tip && (
                  <div className="rounded-lg bg-white/[0.05] border border-white/12 px-3 py-2 text-xs text-white/85 leading-relaxed">
                    <span className="font-bold text-white mr-1">
                      {isKm ? 'គន្លឹះចំណាំ៖' : 'Exam Tip:'}
                    </span>
                    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {detailedExplain.study_tip}
                    </Markdown>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right / Bottom Zone: Control & Analysis Deck (4 cols on desktop) */}
        <aside className="lg:col-span-4 bg-white/[0.05] border border-white/10 rounded-2xl p-4 space-y-4">
          {/* 4-Tab Control Switcher */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => setDeckTab('functions')}
              className={`py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                deckTab === 'functions'
                  ? 'bg-white/[0.14] text-white'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>{isKm ? 'អនុគមន៍' : 'Plot'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDeckTab('table')}
              className={`py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                deckTab === 'table'
                  ? 'bg-white/[0.14] text-white'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{isKm ? 'តារាង' : 'Table'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDeckTab('analysis')}
              className={`py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                deckTab === 'analysis'
                  ? 'bg-white/[0.14] text-white'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>{isKm ? 'វិភាគ' : 'Analyze'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDeckTab('points')}
              className={`py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                deckTab === 'points'
                  ? 'bg-white/[0.14] text-white'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{isKm ? 'ចំណុច' : 'Points'}</span>
            </button>
          </div>

          {/* TAB 1: Photo-to-Graph + Functions + Derivative Overlay + Sliders + Keypad */}
          {deckTab === 'functions' && (
            <div className="space-y-4">
              {/* Photo-to-Graph Smart Upload Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setPhotoDragActive(true);
                }}
                onDragLeave={() => setPhotoDragActive(false)}
                onDrop={handlePhotoDrop}
                className={`rounded-xl border p-3 space-y-2.5 transition-colors ${
                  photoDragActive
                    ? 'bg-white/[0.10] border-white/35 border-dashed'
                    : 'bg-white/[0.04] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">
                      {isKm ? 'សង់ក្រាហ្វពីរូបថត' : 'Plot from Photo'}
                    </p>
                    <p className="text-[11px] text-white/60">
                      {isKm
                        ? 'ថត ឬជ្រើសរើសរូបលំហាត់ ឬបិទភ្ជាប់រូបភាព'
                        : 'Snap, upload, drag, or paste an image'}
                    </p>
                  </div>

                  {/* Replace vs Append switcher */}
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => setPhotoMode('replace')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        photoMode === 'replace'
                          ? 'bg-white/[0.14] text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {isKm ? 'ជំនួស' : 'Replace'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoMode('append')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        photoMode === 'append'
                          ? 'bg-white/[0.14] text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {isKm ? 'បន្ថែម' : 'Append'}
                    </button>
                  </div>
                </div>

                {/* Hidden inputs for Camera & File Picker */}
                <input
                  ref={photoCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoInputChange}
                  className="hidden"
                />
                <input
                  ref={photoFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoInputChange}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={photoScanning}
                    onClick={() => photoCameraInputRef.current?.click()}
                    className="py-2 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.13] disabled:opacity-50 border border-white/12 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span>{isKm ? 'ថតរូប' : 'Camera'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={photoScanning}
                    onClick={() => photoFileInputRef.current?.click()}
                    className="py-2 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.13] disabled:opacity-50 border border-white/12 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{isKm ? 'ជ្រើសរើសរូប' : 'Upload'}</span>
                  </button>
                </div>

                {/* Thumbnail + Live Scan Status / Result */}
                {(photoPreview || photoScanning || photoError) && (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    {photoPreview && (
                      <div className="flex items-start gap-2.5">
                        <img
                          src={photoPreview}
                          alt={isKm ? 'រូបភាពលំហាត់' : 'Uploaded math photo'}
                          className="w-12 h-12 rounded-lg object-cover border border-white/15 shrink-0 bg-[#143844]"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          {photoScanning ? (
                            <div className="flex items-center gap-1.5 text-xs text-white/90">
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              <span>
                                {isKm
                                  ? 'កំពុងអានសមីការ និងសង់ក្រាហ្វ...'
                                  : 'Reading equations & plotting...'}
                              </span>
                            </div>
                          ) : photoMeta ? (
                            <>
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                                <Check className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {isKm
                                    ? `បានសង់ ${photoMeta.equationCount} សមីការ${
                                        photoMeta.pointCount > 0
                                          ? ` · ${photoMeta.pointCount} ចំណុច`
                                          : ''
                                      }`
                                    : `Plotted ${photoMeta.equationCount} eq.${
                                        photoMeta.pointCount > 0
                                          ? ` · ${photoMeta.pointCount} pts`
                                          : ''
                                      }`}
                                </span>
                              </div>
                              {photoMeta.summary && (
                                <p className="text-[11px] text-white/75 leading-snug line-clamp-2">
                                  {photoMeta.summary}
                                </p>
                              )}
                            </>
                          ) : null}
                        </div>

                        {!photoScanning && (
                          <button
                            type="button"
                            onClick={clearPhotoState}
                            aria-label={isKm ? 'បិទរូបភាព' : 'Clear photo'}
                            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/[0.08] cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {photoError && (
                      <div className="rounded-lg bg-rose-500/10 border border-rose-400/25 px-2.5 py-2 text-[11px] text-rose-200 space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{photoError}</span>
                        </div>
                        {lastPhotoFileRef.current && !photoScanning && (
                          <button
                            type="button"
                            onClick={() => processGraphPhoto(lastPhotoFileRef.current)}
                            className="text-[11px] font-semibold text-white underline cursor-pointer"
                          >
                            {isKm ? 'សាកល្បងម្ដងទៀត' : 'Try again'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {compiledFunctions.map((fn) => {
                  const hasSyntaxError = fn.expr.trim().length > 0 && !fn.compiled.ok;
                  const isFocused = activeFnId === fn.id;
                  const supportsDerivative =
                    fn.compiled.ok && fn.compiled.kind === 'function';
                  return (
                    <div
                      key={fn.id}
                      onClick={() => setActiveFnId(fn.id)}
                      className={`rounded-xl border p-2.5 transition-colors ${
                        hasSyntaxError
                          ? 'bg-rose-500/10 border-rose-400/35'
                          : isFocused
                          ? 'bg-white/[0.08] border-white/25'
                          : 'bg-white/[0.04] border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVisibility(fn.id);
                          }}
                          aria-label={fn.visible ? 'Hide curve' : 'Show curve'}
                          className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: fn.visible ? fn.color : 'rgba(255,255,255,0.3)',
                            }}
                          />
                          {fn.visible ? (
                            <Eye className="w-3 h-3 text-white/85" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-white/40" />
                          )}
                        </button>

                        <input
                          ref={(el) => {
                            inputRefs.current[fn.id] = el;
                          }}
                          type="text"
                          value={fn.expr}
                          onFocus={() => setActiveFnId(fn.id)}
                          onChange={(e) => handleUpdateExpr(fn.id, e.target.value)}
                          placeholder={
                            isKm ? 'បញ្ចូលសមីការ ឬអនុគមន៍...' : 'Enter equation or function...'
                          }
                          spellCheck={false}
                          autoCapitalize="none"
                          autoComplete="off"
                          className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-mono text-white placeholder:text-white/35 placeholder:font-kh-body focus:outline-none"
                        />

                        {supportsDerivative && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleDerivative(fn.id);
                            }}
                            title={isKm ? "បង្ហាញខ្សែកោងដេរីវេ f'(x)" : "Toggle derivative f'(x)"}
                            className={`px-1.5 py-1 rounded-md text-[11px] font-mono border transition-colors cursor-pointer shrink-0 ${
                              fn.showDerivative
                                ? 'bg-white/[0.15] border-white/30 text-white font-bold'
                                : 'bg-white/[0.04] border-white/10 text-white/55 hover:text-white'
                            }`}
                          >
                            f&apos;
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFunction(fn.id);
                          }}
                          aria-label={isKm ? 'លុបអនុគមន៍' : 'Remove function'}
                          className="p-1.5 rounded-lg text-white/45 hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {hasSyntaxError && (
                        <p className="mt-1.5 text-[11px] text-rose-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>
                            {isKm
                              ? 'សូមពិនិត្យទម្រង់សមីការឡើងវិញ'
                              : fn.compiled.error}
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddFunction}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isKm ? 'បន្ថែមសមីការ' : 'Add Equation'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSlidersOverride((v) => !v)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      showSliders
                        ? 'bg-white/[0.13] border-white/25 text-white'
                        : 'bg-white/[0.04] border-white/10 text-white/65 hover:bg-white/[0.09] hover:text-white'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>a, b, c</span>
                  </button>
                </div>
              </div>

              {/* Parameter Sliders */}
              {showSliders && (
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/85">
                      {isKm ? 'ប៉ារ៉ាម៉ែត្រកែតម្រូវ (a, b, c)' : 'Parameter Sliders'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setParams({ a: 1, b: 0, c: 0 })}
                      className="text-[11px] text-white/75 hover:text-white underline cursor-pointer"
                    >
                      {isKm ? 'កំណត់ដើម' : 'Reset'}
                    </button>
                  </div>
                  {['a', 'b', 'c'].map((key) => (
                    <label key={key} className="block space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-white/80">{key}</span>
                        <span className="text-white font-bold tabular-nums">
                          {params[key].toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.1"
                        value={params[key]}
                        onChange={(e) =>
                          setParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                        }
                        className="w-full accent-white cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              )}

              {/* Complete Scientific Math Keypad */}
              <div className="space-y-2.5 pt-2.5 border-t border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-white/70">
                    {isKm ? 'ក្ដារចុចគណិតវិទ្យា' : 'Math Keyboard'}
                  </p>
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/10 gap-0.5">
                    {[
                      { id: 'basic', label: '123' },
                      { id: 'func', label: 'f(x)' },
                      { id: 'extra', label: 'a,b,≤' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setKeypadTab(tab.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                          keypadTab === tab.id
                            ? 'bg-white/[0.14] text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Tab Key Matrix */}
                <div className={`grid ${KEYPAD_TABS[keypadTab].colsClass} gap-1.5`}>
                  {KEYPAD_TABS[keypadTab].keys.map((k) => (
                    <button
                      key={`${keypadTab}-${k.label}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleInsertKeypad(k.insert)}
                      className={`h-9 rounded-lg active:scale-95 border text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center ${
                        k.kind === 'num'
                          ? 'bg-white/[0.09] hover:bg-white/[0.16] border-white/15 text-white'
                          : 'bg-white/[0.05] hover:bg-white/[0.13] border-white/10 text-white/90'
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>

                {/* Always-Available Cursor & Edit Control Row */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleKeypadMoveCursor(-1)}
                    aria-label={isKm ? 'រំកិលទៅឆ្វេង' : 'Move cursor left'}
                    title={isKm ? 'រំកិលទៅឆ្វេង' : 'Move left'}
                    className="h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.12] active:scale-95 border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleKeypadMoveCursor(1)}
                    aria-label={isKm ? 'រំកិលទៅស្ដាំ' : 'Move cursor right'}
                    title={isKm ? 'រំកិលទៅស្ដាំ' : 'Move right'}
                    className="h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.12] active:scale-95 border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleKeypadBackspace}
                    aria-label={isKm ? 'លុបថយក្រោយ' : 'Backspace'}
                    title={isKm ? 'លុបថយក្រោយ' : 'Backspace'}
                    className="h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] active:scale-95 border border-white/12 text-white/85 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleKeypadClear}
                    title={isKm ? 'លុបសមីការទាំងអស់' : 'Clear equation'}
                    className="h-8 rounded-lg bg-white/[0.06] hover:bg-rose-500/20 active:scale-95 border border-white/12 hover:border-rose-400/35 text-[11px] font-mono font-bold text-white/85 hover:text-rose-200 transition-all cursor-pointer flex items-center justify-center"
                  >
                    AC
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Value Table (x, f(x), f'(x)) */}
          {deckTab === 'table' && (
            <div className="space-y-3">
              {standardFunctions.length === 0 ? (
                <p className="text-xs text-white/65 py-4 text-center">
                  {isKm
                    ? 'សូមបញ្ចូលអនុគមន៍ទម្រង់ y = f(x) ដើម្បីបង្ហាញតារាងតម្លៃ។'
                    : 'Enter a standard y = f(x) function to generate a value table.'}
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs text-white/75 font-medium">
                      {isKm ? 'ជ្រើសរើសអនុគមន៍' : 'Select Function'}
                    </label>
                    <select
                      value={selectedTableFn?.id || ''}
                      onChange={(e) => setTableFnId(e.target.value)}
                      className="w-full bg-[#153944] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                    >
                      {standardFunctions.map((fn) => (
                        <option key={fn.id} value={fn.id}>
                          f{fn.indexLabel}(x) = {fn.expr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="block space-y-1">
                      <span className="text-[11px] text-white/65">{isKm ? 'ចាប់ពី x' : 'x min'}</span>
                      <input
                        type="number"
                        step="any"
                        value={tableStart}
                        onChange={(e) => setTableStart(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-white/65">{isKm ? 'ដល់ x' : 'x max'}</span>
                      <input
                        type="number"
                        step="any"
                        value={tableEnd}
                        onChange={(e) => setTableEnd(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-white/65">{isKm ? 'ជំហាន' : 'Step'}</span>
                      <select
                        value={tableStep}
                        onChange={(e) => setTableStep(Number(e.target.value))}
                        className="w-full bg-[#153944] border border-white/15 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                      >
                        <option value={0.5}>0.5</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </label>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03]">
                    <table className="w-full text-xs font-mono text-left">
                      <thead className="bg-white/[0.06] text-white/75 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 border-b border-white/10">x</th>
                          <th className="px-3 py-2 border-b border-white/10">f(x)</th>
                          <th className="px-3 py-2 border-b border-white/10">f&apos;(x)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 tabular-nums">
                        {tableRows.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-white/55 font-kh-body">
                              {isKm ? 'គ្មានទិន្នន័យតម្លៃ' : 'No table values'}
                            </td>
                          </tr>
                        ) : (
                          tableRows.map((row) => (
                            <tr key={row.x} className="hover:bg-white/[0.04]">
                              <td className="px-3 py-1.5 text-white/85">{formatCoordNumber(row.x)}</td>
                              <td
                                className={`px-3 py-1.5 ${
                                  Number.isFinite(row.y)
                                    ? 'text-white font-semibold'
                                    : 'text-white/50 font-kh-body'
                                }`}
                              >
                                {formatCoordNumber(row.y)}
                              </td>
                              <td className="px-3 py-1.5 text-white/65">
                                {Number.isFinite(row.dy) ? formatCoordNumber(row.dy) : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: Calculus Analysis (Tangent Line + Integral + Key Features + Oblique Asymptotes) */}
          {deckTab === 'analysis' && (
            <div className="space-y-4">
              {standardFunctions.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-white/65 font-medium">
                      {isKm ? 'អនុគមន៍សម្រាប់វិភាគ' : 'Target Function'}
                    </label>
                    <select
                      value={selectedCalcFn?.id || ''}
                      onChange={(e) => setCalcFnId(e.target.value)}
                      className="w-full bg-[#153944] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                    >
                      {standardFunctions.map((fn) => (
                        <option key={fn.id} value={fn.id}>
                          f{fn.indexLabel}(x) = {fn.expr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tangent Line Card */}
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        {isKm ? 'បន្ទាត់ប៉ះត្រង់ x₀' : 'Tangent Line at x₀'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTangent((v) => !v)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          showTangent
                            ? 'bg-white/[0.15] border-white/30 text-white'
                            : 'bg-white/[0.04] border-white/10 text-white/65 hover:text-white'
                        }`}
                      >
                        {showTangent ? (isKm ? 'បិទ' : 'Hide') : isKm ? 'បង្ហាញ' : 'Show'}
                      </button>
                    </div>

                    {showTangent && (
                      <div className="space-y-2 pt-1 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-white/75 shrink-0">x₀ =</span>
                          <input
                            type="number"
                            step="any"
                            value={tangentX0}
                            onChange={(e) => setTangentX0(e.target.value)}
                            className="w-24 bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                          />
                        </div>
                        {tangentInfo?.valid ? (
                          <div className="text-xs font-mono text-white/85 space-y-0.5 tabular-nums">
                            <p>f&apos;(x₀) = {formatCoordNumber(tangentInfo.slope)}</p>
                            <p className="text-white font-semibold">{tangentInfo.equation}</p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-white/60">
                            {isKm ? 'មិនអាចគណនាបន្ទាត់ប៉ះត្រង់ x₀ នេះបានទេ' : 'Undefined at x₀'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Definite Integral Card */}
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        {isKm ? 'អាំងតេក្រាលកំណត់ ∫[a, b]' : 'Definite Integral ∫[a, b]'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowIntegral((v) => !v)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          showIntegral
                            ? 'bg-white/[0.15] border-white/30 text-white'
                            : 'bg-white/[0.04] border-white/10 text-white/65 hover:text-white'
                        }`}
                      >
                        {showIntegral ? (isKm ? 'បិទ' : 'Hide') : isKm ? 'បង្ហាញ' : 'Show'}
                      </button>
                    </div>

                    {showIntegral && (
                      <div className="space-y-2 pt-1 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-1.5 text-xs font-mono">
                            <span className="text-white/75">a =</span>
                            <input
                              type="number"
                              step="any"
                              value={integralA}
                              onChange={(e) => setIntegralA(e.target.value)}
                              className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-white/40"
                            />
                          </label>
                          <label className="flex items-center gap-1.5 text-xs font-mono">
                            <span className="text-white/75">b =</span>
                            <input
                              type="number"
                              step="any"
                              value={integralB}
                              onChange={(e) => setIntegralB(e.target.value)}
                              className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-white/40"
                            />
                          </label>
                        </div>
                        <p className="text-xs font-mono text-white font-semibold tabular-nums">
                          {integralInfo?.valid
                            ? `∫ f(x) dx = ${formatCoordNumber(integralInfo.value)}`
                            : isKm
                            ? 'មិនកំណត់នៅលើចន្លោះ [a, b] នេះ'
                            : 'Undefined on [a, b]'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Auto-detected Key Features & Asymptotes */}
              <div className="pt-2 border-t border-white/10 space-y-2.5 max-h-64 overflow-y-auto pr-0.5">
                <p className="text-xs font-semibold text-white/85">
                  {isKm ? 'ចំណុចពិសេស និងអាស៊ីមតូតក្នុងផ្ទាំង' : 'Features in View'}
                </p>

                {analysis.intersections.length > 0 && (
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-2.5 space-y-1">
                    <span className="text-[11px] text-white/80 font-semibold">
                      {isKm ? 'ចំណុចប្រសព្វរវាងក្រាហ្វ' : 'Curve Intersections'}
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs font-mono text-white/90">
                      {analysis.intersections.map((pt, idx) => (
                        <span key={idx}>
                          ({formatCoordNumber(pt.x)}, {formatCoordNumber(pt.y)})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.perFunction.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white/[0.04] border border-white/10 p-2.5 space-y-1 text-xs"
                  >
                    <div className="flex items-center gap-2 font-mono font-semibold text-white">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.expr}</span>
                    </div>

                    {item.yIntercept && (
                      <p className="text-white/75 font-mono text-[11px]">
                        Oy: (0, {formatCoordNumber(item.yIntercept.y)})
                      </p>
                    )}

                    {item.xIntercepts.length > 0 && (
                      <p className="text-white/75 font-mono text-[11px]">
                        Ox: {item.xIntercepts.map((p) => `(${formatCoordNumber(p.x)}, 0)`).join(', ')}
                      </p>
                    )}

                    {item.extrema.length > 0 && (
                      <p className="text-white/85 font-mono text-[11px]">
                        {isKm ? 'បរមា៖ ' : 'Extrema: '}
                        {item.extrema
                          .map((p) => `(${formatCoordNumber(p.x)}, ${formatCoordNumber(p.y)})`)
                          .join(', ')}
                      </p>
                    )}

                    {item.inflectionPoints.length > 0 && (
                      <p className="text-white/80 font-mono text-[11px]">
                        {isKm ? 'ចំណុចរបត់៖ ' : 'Inflection: '}
                        {item.inflectionPoints
                          .map((p) => `(${formatCoordNumber(p.x)}, ${formatCoordNumber(p.y)})`)
                          .join(', ')}
                      </p>
                    )}

                    {(item.verticalAsymptotes.length > 0 ||
                      item.horizontalAsymptotes.length > 0 ||
                      item.obliqueAsymptotes.length > 0) && (
                      <p className="text-amber-200 font-mono text-[11px]">
                        {isKm ? 'អាស៊ីមតូត៖ ' : 'Asymptotes: '}
                        {[
                          ...item.verticalAsymptotes.map((vx) => `x = ${formatCoordNumber(vx)}`),
                          ...item.horizontalAsymptotes.map((hy) => `y = ${formatCoordNumber(hy)}`),
                          ...item.obliqueAsymptotes.map((o) => formatLinearEquation(o.m, o.b)),
                        ].join(' , ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Custom Plotted Points + Connect Segments/Polygon */}
          {deckTab === 'points' && (
            <div className="space-y-4">
              <form onSubmit={handleAddCustomPoint} className="space-y-2">
                <p className="text-xs font-semibold text-white/85">
                  {isKm ? 'ដៅចំណុច (x, y) លើក្រាហ្វ' : 'Plot Custom Point (x, y)'}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={ptLabel}
                    onChange={(e) => setPtLabel(e.target.value)}
                    placeholder={isKm ? 'ឈ្មោះ' : 'Label'}
                    maxLength={4}
                    aria-label="Point label"
                    className="bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                  />
                  <input
                    type="number"
                    step="any"
                    value={ptX}
                    onChange={(e) => setPtX(e.target.value)}
                    placeholder="x"
                    aria-label="X coordinate"
                    className="bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                  />
                  <input
                    type="number"
                    step="any"
                    value={ptY}
                    onChange={(e) => setPtY(e.target.value)}
                    placeholder="y"
                    aria-label="Y coordinate"
                    className="bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-white/[0.12] hover:bg-white/[0.18] border border-white/15 text-white font-semibold text-xs px-2 py-1.5 transition-colors cursor-pointer"
                  >
                    {isKm ? 'បន្ថែម' : 'Add'}
                  </button>
                </div>
              </form>

              {customPoints.length >= 2 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-white/65 font-medium block">
                    {isKm ? 'ភ្ជាប់ចំណុចជាធរណីមាត្រ' : 'Connect Points'}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: isKm ? 'ដាច់ដោយឡែក' : 'Dots' },
                      { id: 'polyline', label: isKm ? 'ខ្សែបន្ទាត់' : 'Line' },
                      { id: 'polygon', label: isKm ? 'ពហុកោណ' : 'Polygon' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setConnectPointsMode(opt.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          connectPointsMode === opt.id
                            ? 'bg-white/[0.14] border-white/25 text-white'
                            : 'bg-white/[0.04] border-white/10 text-white/65 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {customPoints.length > 0 && (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {customPoints.map((pt) => (
                    <div
                      key={pt.id}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-mono"
                    >
                      <span className="text-emerald-300 font-semibold">
                        {pt.label || 'P'}({formatCoordNumber(pt.x)}, {formatCoordNumber(pt.y)})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomPoints((prev) => prev.filter((item) => item.id !== pt.id))
                        }
                        className="text-white/45 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Bottom Section: Student Improvement Request -> Telegram Bot */}
      <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-2.5 pb-3 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 text-white/90 inline-flex items-center justify-center shrink-0 mt-0.5">
            <MessageSquarePlus className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white">
              {isKm ? 'សំណើកែសម្រួល និងបន្ថែមមុខងារ' : 'Suggest Improvements'}
            </h2>
            <p className="text-xs text-white/65">
              {isKm
                ? 'សរសេរសំណើកែសម្រួល ឬបន្ថែមចំណុចខ្វះខាតជាក់ស្ដែង ដើម្បីអភិវឌ្ឍមុខងារគូសក្រាហ្វឲ្យកាន់តែល្អប្រសើរ'
                : 'Report issues or request missing graphing features directly to the team'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitGraphFeedback} className="space-y-4">
          {/* Row 1: Student Name + Request Category cleanly aligned */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            <div className="md:col-span-5 space-y-1.5">
              <label className="block text-xs font-medium text-white/80">
                {isKm ? 'ឈ្មោះសិស្ស' : 'Student Name'}
              </label>
              <input
                type="text"
                value={fbName}
                onChange={(e) => {
                  setFbName(e.target.value);
                  setFbSuccess(false);
                }}
                placeholder={isKm ? 'បញ្ចូលឈ្មោះរបស់អ្នក' : 'Enter your name'}
                maxLength={120}
                className="w-full h-10 bg-white/[0.05] border border-white/15 rounded-xl px-3.5 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/35 transition-colors"
              />
            </div>

            <div className="md:col-span-7 space-y-1.5">
              <label className="block text-xs font-medium text-white/80">
                {isKm ? 'ប្រភេទសំណើ' : 'Category'}
              </label>
              <div className="w-full overflow-x-auto">
                <div className="grid grid-cols-4 gap-1.5 min-w-[320px] h-10 p-1 rounded-xl bg-white/[0.04] border border-white/10">
                  {[
                    { id: 'feature', label: isKm ? 'បន្ថែមមុខងារ' : 'Feature' },
                    { id: 'accuracy', label: isKm ? 'ភាពត្រឹមត្រូវ' : 'Accuracy' },
                    { id: 'bug', label: isKm ? 'កែកំហុស' : 'Bug' },
                    { id: 'other', label: isKm ? 'ផ្សេងៗ' : 'Other' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFbCategory(cat.id);
                        setFbSuccess(false);
                      }}
                      className={`px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center ${
                        fbCategory === cat.id
                          ? 'bg-white/[0.14] text-white'
                          : 'text-white/65 hover:bg-white/[0.07] hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Full-width Details Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/80">
              {isKm ? 'ខ្លឹមសារសំណើកែសម្រួល' : 'Suggestion Details'}
            </label>
            <textarea
              rows={3}
              value={fbMessage}
              onChange={(e) => {
                setFbMessage(e.target.value);
                setFbError('');
                setFbSuccess(false);
              }}
              placeholder={
                isKm
                  ? 'សរសេរសំណើកែសម្រួល ឬមតិយោបល់នៅទីនេះ...'
                  : 'Write your suggestion or feedback here...'
              }
              maxLength={2000}
              className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/35 resize-y leading-relaxed transition-colors"
            />
          </div>

          {/* Row 3: Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
            <label className="inline-flex items-center gap-2 text-xs text-white/75 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={fbAttachEquations}
                onChange={(e) => setFbAttachEquations(e.target.checked)}
                className="rounded border-white/25 bg-white/[0.06] accent-white cursor-pointer"
              />
              <span>
                {isKm
                  ? 'ភ្ជាប់សមីការដែលកំពុងគូសបច្ចុប្បន្នទៅជាមួយ'
                  : 'Attach current plotted equations'}
              </span>
            </label>

            <button
              type="submit"
              disabled={fbSubmitting}
              className="h-10 px-5 rounded-xl bg-white/[0.12] hover:bg-white/[0.18] disabled:opacity-50 border border-white/20 text-xs sm:text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              {fbSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {fbSubmitting
                  ? isKm
                    ? 'កំពុងផ្ញើសំណើ...'
                    : 'Sending...'
                  : isKm
                  ? 'ផ្ញើសំណើ'
                  : 'Send Request'}
              </span>
            </button>
          </div>

          {fbError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-400/25 px-3 py-2 text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fbError}</span>
            </div>
          )}

          {fbSuccess && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/25 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>
                {isKm
                  ? 'បានផ្ញើសំណើរបស់អ្នកជោគជ័យ! អរគុណសម្រាប់ការរួមចំណែកកែលម្អកម្មវិធី។'
                  : 'Your request has been sent! Thank you for helping improve Graphing Lab.'}
              </span>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
