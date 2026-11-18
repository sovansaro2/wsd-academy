import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X,
  Download,
  ExternalLink,
  HardDriveDownload,
  Trash2,
  Loader2,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  Moon,
  Sun,
  MoreHorizontal,
} from 'lucide-react';
import { formatFileSize, formatGradeLabel, toKhmerNumber } from '../../data/librarySubjects';
import { openPdfDocument, extractAndStoreBookCover } from '../../utils/pdfClient';

const LAST_PAGE_PREFIX = 'wsd_library_last_page_';
const NIGHT_MODE_KEY = 'wsd_library_reader_night';

function readSavedPage(r2Key) {
  if (typeof window === 'undefined' || !r2Key) return 1;
  try {
    const val = Number(localStorage.getItem(`${LAST_PAGE_PREFIX}${r2Key}`) || '1');
    return Number.isFinite(val) && val >= 1 ? Math.floor(val) : 1;
  } catch {
    return 1;
  }
}

function writeSavedPage(r2Key, page) {
  if (typeof window === 'undefined' || !r2Key) return;
  try {
    localStorage.setItem(`${LAST_PAGE_PREFIX}${r2Key}`, String(page));
  } catch {
    // Ignore storage quota errors
  }
}

const PdfPageItem = React.memo(function PdfPageItem({
  pdfDoc,
  pageNumber,
  defaultAspectRatio,
  stageWidth,
  zoomFactor,
  isNightMode,
  scrollRoot,
  registerRef,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(pageNumber <= 3);
  const [aspectRatio, setAspectRatio] = useState(defaultAspectRatio);
  const [isRendered, setIsRendered] = useState(false);

  const setRefs = useCallback(
    (el) => {
      containerRef.current = el;
      registerRef(pageNumber, el);
    },
    [pageNumber, registerRef]
  );

  // Lazy-render pages near the visible scroll viewport (keeps memory low for 100+ page books)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !scrollRoot) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setShouldRender(entry.isIntersecting);
        }
      },
      {
        root: scrollRoot,
        rootMargin: '900px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot]);

  // Target CSS dimensions: always fit cleanly inside stageWidth at 100% zoom
  const cssWidth = Math.max(180, Math.floor(stageWidth * zoomFactor));
  const cssHeight = Math.max(220, Math.floor(cssWidth * aspectRatio));

  useEffect(() => {
    if (!shouldRender || !pdfDoc) {
      setIsRendered(false);
      return;
    }

    let cancelled = false;

    const drawPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) {
          page.cleanup();
          return;
        }

        const baseVp = page.getViewport({ scale: 1 });
        const pageRatio = baseVp.height / Math.max(1, baseVp.width);
        if (Math.abs(pageRatio - aspectRatio) > 0.01) {
          setAspectRatio(pageRatio);
        }

        const canvas = canvasRef.current;
        if (!canvas) {
          page.cleanup();
          return;
        }

        const fitScale = stageWidth / Math.max(1, baseVp.width);
        const targetScale = Math.max(0.05, Math.min(4.0, fitScale * zoomFactor));
        const viewport = page.getViewport({ scale: targetScale });
        const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

        const pixelW = Math.max(1, Math.floor(viewport.width * dpr));
        const pixelH = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.width = pixelW;
        canvas.height = pixelH;

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // Ignore cancel error
          }
          renderTaskRef.current = null;
        }

        const renderTask = page.render({
          canvas,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          background: '#FFFFFF',
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!cancelled) {
          setIsRendered(true);
        }
        page.cleanup();
      } catch (err) {
        if (!cancelled && err?.name !== 'RenderingCancelledException') {
          console.warn(`PDF page ${pageNumber} render error:`, err);
        }
      }
    };

    drawPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore
        }
        renderTaskRef.current = null;
      }
    };
  }, [shouldRender, pdfDoc, pageNumber, stageWidth, zoomFactor, aspectRatio]);

  return (
    <div
      ref={setRefs}
      data-page-number={pageNumber}
      style={{ width: `${cssWidth}px`, height: `${cssHeight}px` }}
      className={`mx-auto relative shrink-0 rounded-sm overflow-hidden shadow-md transition-colors ${
        isNightMode
          ? 'bg-slate-800 border border-slate-700'
          : 'bg-white'
      }`}
    >
      {shouldRender ? (
        <>
          <canvas
            ref={canvasRef}
            style={{ width: `${cssWidth}px`, height: `${cssHeight}px` }}
            className={`block ${isNightMode ? 'brightness-90 contrast-95' : ''}`}
          />
          {!isRendered && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#194350]/85">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          )}
        </>
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center text-xs tabular-nums ${
            isNightMode ? 'text-slate-500' : 'text-[#194350]/60'
          }`}
        >
          {pageNumber}
        </div>
      )}
    </div>
  );
});

export default function PdfReaderModal({
  book,
  isKm = true,
  isOfflineSaved = false,
  downloadProgress = null,
  onClose,
  onSaveOffline,
  onRemoveOffline,
  onCoverGenerated,
}) {
  const viewportRef = useRef(null);
  const moreMenuRef = useRef(null);
  const pageRefs = useRef({});
  const pdfDocRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);
  const initialScrollDoneRef = useRef(false);

  const [viewportEl, setViewportEl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(true);
  const [loadProgress, setLoadProgress] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isUsingLocalCache, setIsUsingLocalCache] = useState(false);

  const [numPages, setNumPages] = useState(0);
  const [defaultAspectRatio, setDefaultAspectRatio] = useState(1.414);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoomFactor, setZoomFactor] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [reloadTick, setReloadTick] = useState(0);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const [isNightMode, setIsNightMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(NIGHT_MODE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const setViewportNode = useCallback((node) => {
    viewportRef.current = node;
    setViewportEl(node);
  }, []);

  const registerPageRef = useCallback((pageNum, el) => {
    if (el) {
      pageRefs.current[pageNum] = el;
    } else {
      delete pageRefs.current[pageNum];
    }
  }, []);

  const toggleNightMode = () => {
    setIsNightMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(NIGHT_MODE_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Measure viewport container width reliably
  useEffect(() => {
    if (!viewportEl) return;

    const updateWidth = () => {
      if (viewportEl) {
        setContainerWidth(viewportEl.clientWidth);
      }
    };
    updateWidth();

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateWidth);
      observer.observe(viewportEl);
    } else {
      window.addEventListener('resize', updateWidth);
    }

    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', updateWidth);
    };
  }, [viewportEl]);

  // Close overflow menu on outside click
  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const handleOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isMoreMenuOpen]);

  // Open PDF document via PDF.js (offline ArrayBuffer first, then range-streamed R2/proxy)
  useEffect(() => {
    if (!book) return;
    let cancelled = false;
    let activeTask = null;
    let activeDoc = null;
    initialScrollDoneRef.current = false;
    pageRefs.current = {};

    const initDoc = async () => {
      setIsLoadingDoc(true);
      setPdfDoc(null);
      setLoadError(null);
      setLoadProgress(null);
      setNumPages(0);

      try {
        const opened = await openPdfDocument(book, {
          forCoverOnly: false,
          onProgress: (pct) => {
            if (!cancelled) setLoadProgress(pct);
          },
        });

        if (cancelled) {
          try {
            if (typeof opened.pdfDoc?.destroy === 'function') {
              await opened.pdfDoc.destroy();
            } else if (typeof opened.pdfDoc?.cleanup === 'function') {
              await opened.pdfDoc.cleanup();
            }
            if (typeof opened.loadingTask?.destroy === 'function') {
              await opened.loadingTask.destroy();
            }
          } catch {
            // Ignore cleanup errors
          }
          return;
        }

        activeDoc = opened.pdfDoc;
        activeTask = opened.loadingTask;
        pdfDocRef.current = opened.pdfDoc;

        // Read page 1 aspect ratio so all page containers size accurately before drawing
        let ratio = 1.414;
        try {
          const p1 = await opened.pdfDoc.getPage(1);
          const vp1 = p1.getViewport({ scale: 1 });
          if (vp1.width > 0 && vp1.height > 0) {
            ratio = vp1.height / vp1.width;
          }
          p1.cleanup();
        } catch {
          // Fallback A4 aspect ratio
        }

        if (cancelled) return;

        const total = opened.pdfDoc.numPages || 1;
        const saved = Math.min(total, Math.max(1, readSavedPage(book.r2_key)));

        setPdfDoc(opened.pdfDoc);
        setDefaultAspectRatio(ratio);
        setIsUsingLocalCache(opened.isLocalCache);
        setNumPages(total);
        setCurrentPage(saved);
        setPageInput(String(saved));
        setIsLoadingDoc(false);

        // Opportunistically generate & store Page-1 cover if missing
        if (!book.cover_url && book.r2_key) {
          extractAndStoreBookCover(book, opened.pdfDoc)
            .then((res) => {
              if (!cancelled && res && onCoverGenerated) {
                onCoverGenerated(book.r2_key, res.localUrl, res.coverUrl);
              }
            })
            .catch(() => {
              // Non-fatal background cover capture
            });
        }
      } catch (err) {
        if (cancelled) return;
        setIsLoadingDoc(false);
        setLoadError(
          err?.message ||
            (isKm
              ? 'មិនអាចបើកឯកសារ PDF នៅក្នុងផ្ទាំងនេះបានទេ។'
              : 'Unable to render this PDF document.')
        );
      }
    };

    initDoc();

    return () => {
      cancelled = true;
      pdfDocRef.current = null;
      setPdfDoc(null);
      if (activeDoc) {
        if (typeof activeDoc.destroy === 'function') {
          Promise.resolve(activeDoc.destroy()).catch(() => {});
        } else if (typeof activeDoc.cleanup === 'function') {
          Promise.resolve(activeDoc.cleanup()).catch(() => {});
        }
      }
      if (activeTask && typeof activeTask.destroy === 'function') {
        Promise.resolve(activeTask.destroy()).catch(() => {});
      }
    };
  }, [book, isOfflineSaved, reloadTick, isKm]);

  const scrollToPage = useCallback(
    (target, smooth = true) => {
      if (numPages <= 0) return;
      const clamped = Math.min(numPages, Math.max(1, Math.floor(Number(target) || 1)));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
      writeSavedPage(book?.r2_key, clamped);

      const pageEl = pageRefs.current[clamped];
      if (pageEl && viewportEl) {
        isProgrammaticScrollRef.current = true;
        viewportEl.scrollTo({
          top: Math.max(0, pageEl.offsetTop - (viewportEl.clientWidth < 640 ? 12 : 20)),
          behavior: smooth ? 'smooth' : 'auto',
        });
        window.setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, smooth ? 450 : 60);
      }
    },
    [numPages, book?.r2_key, viewportEl]
  );

  // Restore saved reading page on initial document mount
  useEffect(() => {
    if (isLoadingDoc || numPages <= 0 || !viewportEl || initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    const saved = Math.min(numPages, Math.max(1, readSavedPage(book?.r2_key)));
    if (saved > 1) {
      requestAnimationFrame(() => {
        scrollToPage(saved, false);
      });
    }
  }, [isLoadingDoc, numPages, viewportEl, book?.r2_key, scrollToPage]);

  // Track current visible page continuously while user scrolls via trackpad/wheel/touch
  useEffect(() => {
    if (!viewportEl || numPages <= 0 || isLoadingDoc) return;

    let rafId = null;
    const updateActivePageFromScroll = () => {
      rafId = null;
      if (isProgrammaticScrollRef.current) return;

      const viewMid = viewportEl.scrollTop + viewportEl.clientHeight * 0.35;
      let bestPage = 1;
      let bestDist = Infinity;

      for (let p = 1; p <= numPages; p++) {
        const el = pageRefs.current[p];
        if (!el) continue;
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (viewMid >= top && viewMid <= bottom) {
          bestPage = p;
          break;
        }
        const dist = Math.min(Math.abs(viewMid - top), Math.abs(viewMid - bottom));
        if (dist < bestDist) {
          bestDist = dist;
          bestPage = p;
        }
      }

      setCurrentPage((prev) => {
        if (prev !== bestPage) {
          setPageInput(String(bestPage));
          writeSavedPage(book?.r2_key, bestPage);
        }
        return bestPage;
      });
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateActivePageFromScroll);
    };

    viewportEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      viewportEl.removeEventListener('scroll', handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [viewportEl, numPages, isLoadingDoc, book?.r2_key]);

  // Keyboard navigation
  useEffect(() => {
    if (!book) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isMoreMenuOpen) {
          setIsMoreMenuOpen(false);
        } else {
          onClose();
        }
        return;
      }
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToPage(currentPage + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book, onClose, currentPage, scrollToPage, isMoreMenuOpen]);

  if (!book) return null;

  const isDownloadingOffline = typeof downloadProgress === 'number';
  const downloadHref = book.r2_key
    ? `/api/library/pdf-proxy?key=${encodeURIComponent(book.r2_key)}&download=1`
    : book.pdf_url;
  const externalHref =
    book.pdf_url ||
    (book.r2_key ? `/api/library/pdf-proxy?key=${encodeURIComponent(book.r2_key)}` : '');

  const horizontalPadding = containerWidth < 640 ? 24 : 48;
  const stageWidth =
    containerWidth > 0
      ? Math.min(860, Math.max(220, containerWidth - horizontalPadding))
      : 320;

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    scrollToPage(pageInput);
  };

  const readerModal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed inset-0 z-[60] bg-[#081a21]/80 flex items-center justify-center p-0 sm:p-4 font-kh-body"
      role="dialog"
      aria-modal="true"
      aria-label={book.title}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-5xl h-full sm:h-[92vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-colors will-change-transform transform-gpu ${
          isNightMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-[#194350] border-white/15 text-white'
        }`}
      >
        {/* Clean, Spacious Reader Header */}
        <header
          className={`px-3.5 sm:px-5 pt-2.5 pb-2 border-b transition-colors shrink-0 ${
            isNightMode ? 'bg-slate-900 border-slate-800' : 'bg-[#194350] border-white/10'
          }`}
        >
          {/* Tier 1: Title + Calm Utility Actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                className={`font-kh-title text-sm sm:text-base leading-snug truncate ${
                  isNightMode ? 'text-slate-100' : 'text-white'
                }`}
              >
                {book.title}
              </h2>
              <div
                className={`flex items-center gap-1.5 text-[11px] sm:text-xs tabular-nums truncate ${
                  isNightMode ? 'text-slate-400' : 'text-white/75'
                }`}
              >
                <span>{formatGradeLabel(book.grade, isKm)}</span>
                <span aria-hidden="true">·</span>
                <span>{formatFileSize(book.file_size)}</span>
                {isUsingLocalCache && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        isNightMode ? 'text-emerald-400' : 'text-emerald-300'
                      }`}
                    >
                      <WifiOff className="w-3 h-3" />
                      {isKm ? 'Offline' : 'Offline'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleNightMode}
                aria-label={isKm ? 'ប្ដូរពន្លឺអាន' : 'Toggle reading light mode'}
                title={
                  isKm
                    ? isNightMode
                      ? 'អេក្រង់ភ្លឺ'
                      : 'អេក្រង់ងងឹត'
                    : isNightMode
                    ? 'Light mode'
                    : 'Night mode'
                }
                className={`w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  isNightMode
                    ? 'text-amber-300 hover:bg-slate-800'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <div ref={moreMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                  aria-label={isKm ? 'ជម្រើសបន្ថែម' : 'More options'}
                  aria-expanded={isMoreMenuOpen}
                  className={`w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isNightMode
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {isMoreMenuOpen && (
                  <div
                    className={`absolute right-0 z-30 mt-1.5 w-52 rounded-xl border shadow-2xl p-1.5 space-y-0.5 ${
                      isNightMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-[#1d4d5c] border-white/15 text-white'
                    }`}
                  >
                    <a
                      href={downloadHref}
                      download={`${book.title}.pdf`}
                      onClick={() => setIsMoreMenuOpen(false)}
                      className={`w-full min-h-[38px] px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-colors ${
                        isNightMode ? 'hover:bg-slate-700' : 'hover:bg-white/10'
                      }`}
                    >
                      <Download className="w-4 h-4 opacity-80" />
                      <span>{isKm ? 'ទាញយកឯកសារ PDF' : 'Download PDF'}</span>
                    </a>

                    {externalHref && (
                      <a
                        href={externalHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsMoreMenuOpen(false)}
                        className={`w-full min-h-[38px] px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-colors ${
                          isNightMode ? 'hover:bg-slate-700' : 'hover:bg-white/10'
                        }`}
                      >
                        <ExternalLink className="w-4 h-4 opacity-80" />
                        <span>{isKm ? 'បើកក្នុងផ្ទាំងថ្មី' : 'Open in New Tab'}</span>
                      </a>
                    )}

                    <div
                      className={`my-1 border-t ${
                        isNightMode ? 'border-slate-700' : 'border-white/10'
                      }`}
                    />

                    {isOfflineSaved ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          onRemoveOffline(book);
                        }}
                        className={`w-full min-h-[38px] px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                          isNightMode
                            ? 'text-rose-400 hover:bg-slate-700'
                            : 'text-rose-300 hover:bg-rose-500/15'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{isKm ? 'លុបចេញពី Offline' : 'Remove Offline Copy'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isDownloadingOffline}
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          onSaveOffline(book);
                        }}
                        className={`w-full min-h-[38px] px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                          isNightMode ? 'hover:bg-slate-700' : 'hover:bg-white/10'
                        }`}
                      >
                        {isDownloadingOffline ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <HardDriveDownload className="w-4 h-4 opacity-80" />
                        )}
                        <span>
                          {isDownloadingOffline
                            ? `${downloadProgress}%`
                            : isKm
                            ? 'រក្សាទុកអាន Offline'
                            : 'Save for Offline'}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={isKm ? 'បិទ' : 'Close'}
                className={`w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  isNightMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tier 2: Single Slim Reading Navigation & Zoom Strip */}
          {numPages > 0 && !loadError && (
            <div
              className={`mt-2 pt-2 border-t flex items-center justify-between gap-2 text-xs ${
                isNightMode ? 'border-slate-800' : 'border-white/10'
              }`}
            >
              {/* Page Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => scrollToPage(currentPage - 1)}
                  aria-label={isKm ? 'ទំព័រមុន' : 'Previous page'}
                  className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed ${
                    isNightMode
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <form onSubmit={handlePageInputSubmit} className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={() => scrollToPage(pageInput)}
                    aria-label={isKm ? 'លេខទំព័រ' : 'Page number'}
                    className={`w-11 h-7 px-1 text-center rounded-md border text-xs font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/35 ${
                      isNightMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-white/[0.07] border-white/15 focus:border-[#38BDF8] text-white'
                    }`}
                  />
                  <span
                    className={`tabular-nums whitespace-nowrap ${
                      isNightMode ? 'text-slate-400' : 'text-white/75'
                    }`}
                  >
                    / {isKm ? toKhmerNumber(numPages) : numPages}
                  </span>
                </form>

                <button
                  type="button"
                  disabled={currentPage >= numPages}
                  onClick={() => scrollToPage(currentPage + 1)}
                  aria-label={isKm ? 'ទំព័របន្ទាប់' : 'Next page'}
                  className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed ${
                    isNightMode
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  type="button"
                  disabled={zoomFactor <= 0.6}
                  onClick={() => setZoomFactor((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                  aria-label={isKm ? 'បង្រួម' : 'Zoom out'}
                  className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed ${
                    isNightMode
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span
                  className={`min-w-[42px] text-center text-xs font-medium tabular-nums ${
                    isNightMode ? 'text-slate-300' : 'text-white'
                  }`}
                >
                  {Math.round(zoomFactor * 100)}%
                </span>

                <button
                  type="button"
                  disabled={zoomFactor >= 2.2}
                  onClick={() => setZoomFactor((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                  aria-label={isKm ? 'ពង្រីក' : 'Zoom in'}
                  className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed ${
                    isNightMode
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {zoomFactor !== 1 && (
                  <button
                    type="button"
                    onClick={() => setZoomFactor(1)}
                    aria-label={isKm ? 'ទំហំដើម' : 'Fit width'}
                    title={isKm ? 'ទំហំដើម' : 'Fit to width'}
                    className={`h-8 px-2 inline-flex items-center gap-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      isNightMode
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isKm ? 'ពេញផ្ទាំង' : 'Fit'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Continuous Vertical Scroll PDF Stage (Trackpad & Touch Scrollable) */}
        <div
          ref={setViewportNode}
          className={`flex-1 overflow-auto relative p-3 sm:p-6 transition-colors overscroll-contain ${
            isNightMode ? 'bg-slate-950' : 'bg-[#194350]'
          }`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {isLoadingDoc ? (
            <div
              className={`h-full flex flex-col items-center justify-center gap-2.5 text-sm ${
                isNightMode ? 'text-slate-300' : 'text-white'
              }`}
            >
              <Loader2 className={`w-7 h-7 animate-spin ${isNightMode ? 'text-white' : 'text-white'}`} />
              <span className="tabular-nums">
                {loadProgress !== null
                  ? isKm
                    ? `កំពុងផ្ទុកសៀវភៅ (${toKhmerNumber(loadProgress)}%)...`
                    : `Loading book (${loadProgress}%)...`
                  : isKm
                  ? 'កំពុងបើកសៀវភៅ...'
                  : 'Opening book...'}
              </span>
            </div>
          ) : loadError ? (
            <div className="h-full flex items-center justify-center">
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-6 max-w-md text-center space-y-4 text-white">
                <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-300 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    {isKm ? 'មានបញ្ហាក្នុងការបើកសៀវភៅ' : 'Unable to Open Book'}
                  </p>
                  <p className="text-xs text-white/75 leading-relaxed">{loadError}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReloadTick((n) => n + 1)}
                    className="min-h-[40px] px-4 py-2 bg-[#38BDF8] text-[#092731] text-xs font-bold rounded-lg hover:bg-[#56CAF9] transition-colors cursor-pointer"
                  >
                    {isKm ? 'សាកល្បងម្ដងទៀត' : 'Retry'}
                  </button>
                  <a
                    href={downloadHref}
                    download={`${book.title}.pdf`}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 bg-white/[0.08] text-white text-xs font-semibold rounded-lg hover:bg-white/15 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isKm ? 'ទាញយក PDF' : 'Download PDF'}</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-fit min-w-full flex flex-col gap-3 sm:gap-5 pb-6">
              {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNumber) => (
                <PdfPageItem
                  key={`${book.r2_key}-${pageNumber}`}
                  pdfDoc={pdfDoc}
                  pageNumber={pageNumber}
                  defaultAspectRatio={defaultAspectRatio}
                  stageWidth={stageWidth}
                  zoomFactor={zoomFactor}
                  isNightMode={isNightMode}
                  scrollRoot={viewportEl}
                  registerRef={registerPageRef}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  if (typeof document === 'undefined') return readerModal;
  return createPortal(readerModal, document.body);
}
