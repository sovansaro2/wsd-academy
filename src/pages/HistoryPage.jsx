import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, LayoutGroup } from 'motion/react';
import {
  History,
  Calculator,
  PenLine,
  Search,
  Trash2,
  ArrowLeft,
  Copy,
  Check,
  Code,
  ListTodo,
  ListOrdered,
  FileText,
  Bookmark,
  BookmarkCheck,
  WifiOff,
  X,
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import AuthRequiredBanner from '../components/auth/AuthRequiredBanner';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/usePWA';
import {
  getStudyHistory,
  hydrateStudyHistoryFromOfflineDB,
  deleteStudyHistoryItem,
  clearStudyHistory,
} from '../utils/studyHistory';
import {
  findSavedEssayByResult,
  saveEssayItem,
} from '../utils/savedEssays';
import {
  getGradeLabel,
  getEssayLengthMetrics,
  formatOutlineToPlainText,
  formatEssayToPlainText,
} from '../data/essayPresets';
import { latexToPlainText } from '../utils/mathUtils';
import { toKhmerNumber } from '../data/librarySubjects';

function formatHistoryDate(isoStr, isKm) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleString(isKm ? 'km-KH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function HistoryPage() {
  const { language } = useLanguage();
  const { isAuthenticated, currentUser } = useAuth();
  const isOnline = useOnlineStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const isKm = language === 'km';

  const [items, setItems] = useState(() => getStudyHistory(currentUser));
  const [filterKind, setFilterKind] = useState('all'); // 'all' | 'solver' | 'essay'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(() => searchParams.get('item') || null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [copiedId, setCopiedId] = useState(null);
  const [essayTab, setEssayTab] = useState('outline'); // 'outline' | 'essay'
  const [savedEssaySyncTick, setSavedEssaySyncTick] = useState(0);

  useEffect(() => {
    const paramId = searchParams.get('item');
    if (paramId) setSelectedId(paramId);
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    const sync = () => setItems(getStudyHistory(currentUser));
    sync();
    hydrateStudyHistoryFromOfflineDB(currentUser).then((merged) => {
      if (Array.isArray(merged)) setItems(merged);
    });
    window.addEventListener('wsd:study-history-updated', sync);
    return () => window.removeEventListener('wsd:study-history-updated', sync);
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    const onSavedUpdate = () => setSavedEssaySyncTick((n) => n + 1);
    window.addEventListener('wsd:saved-essays-updated', onSavedUpdate);
    return () => window.removeEventListener('wsd:saved-essays-updated', onSavedUpdate);
  }, []);

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) || null,
    [items, selectedId]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (filterKind !== 'all' && item.kind !== filterKind) return false;
      if (!q) return true;
      if (item.kind === 'solver') {
        const hay = `${item.promptText || ''} ${latexToPlainText(item.result?.short_answer || '')} ${latexToPlainText(item.result?.detailed_answer || '')}`.toLowerCase();
        return hay.includes(q);
      }
      const hay = `${item.promptText || ''} ${item.result?.detected_topic || ''} ${item.result?.essay_type_label || ''} ${getGradeLabel(item.grade, isKm)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, filterKind, searchQuery, isKm]);

  const handleOpenItem = (id) => {
    setSelectedId(id);
    setEssayTab('outline');
    setConfirmDeleteId(null);
    setSearchParams({ item: id }, { replace: true });
  };

  const handleBackToList = () => {
    setSelectedId(null);
    setConfirmDeleteId(null);
    setSearchParams({}, { replace: true });
  };

  const handleDeleteOne = (id) => {
    const next = deleteStudyHistoryItem(currentUser, id);
    setItems(next);
    setConfirmDeleteId(null);
    if (selectedId === id) {
      handleBackToList();
    }
  };

  const handleClearAll = () => {
    clearStudyHistory(currentUser);
    setItems([]);
    setConfirmClearAll(false);
    handleBackToList();
  };

  const handleCopyText = (key, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2200);
  };

  if (!isAuthenticated) {
    return (
      <div id="history-page" className="space-y-6 font-kh-body pb-10">
        <div className="pb-4 border-b border-white/10">
          <h1 className="font-kh-title text-2xl text-white">
            {isKm ? 'ប្រវត្តិសិក្សា' : 'Study History'}
          </h1>
          <p className="text-xs sm:text-sm text-white/75 mt-1">
            {isKm
              ? 'មើលលំហាត់ និងតែងសេចក្ដីដែលបានសិក្សាកន្លងមក (អាន Offline បាន)'
              : 'Review previously solved problems and generated essays offline'}
          </p>
        </div>
        <AuthRequiredBanner featureName={isKm ? 'ប្រវត្តិសិក្សា' : 'Study History'} />
      </div>
    );
  }

  // DETAIL VIEW
  if (selectedItem) {
    const isSolver = selectedItem.kind === 'solver';
    const isAlreadyBookmarked =
      !isSolver && savedEssaySyncTick >= 0
        ? Boolean(findSavedEssayByResult(currentUser, selectedItem.result, selectedItem.grade))
        : false;

    return (
      <div id="history-detail-page" className="max-w-4xl mx-auto space-y-5 font-kh-body pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex items-center gap-2 text-white hover:underline font-semibold text-sm transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isKm ? 'ត្រឡប់ទៅប្រវត្តិ' : 'Back to History'}</span>
          </button>

          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-xs text-[#38BDF8] font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirmDeleteId === selectedItem.id) {
                  handleDeleteOne(selectedItem.id);
                } else {
                  setConfirmDeleteId(selectedItem.id);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                confirmDeleteId === selectedItem.id
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/[0.07] text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {confirmDeleteId === selectedItem.id
                  ? isKm
                    ? 'បញ្ជាក់លុប'
                    : 'Confirm'
                  : isKm
                  ? 'លុប'
                  : 'Delete'}
              </span>
            </button>
          </div>
        </div>

        {isSolver ? (
          <div className="space-y-6">
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#38BDF8]">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ដោះស្រាយលំហាត់' : 'Problem Solver'}</span>
                </span>
                {selectedItem.createdAt && (
                  <>
                    <span>·</span>
                    <span className="tabular-nums">{formatHistoryDate(selectedItem.createdAt, isKm)}</span>
                  </>
                )}
              </div>
              <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                {selectedItem.promptText || (isKm ? 'លំហាត់ពីរូបភាព' : 'Problem from uploaded image')}
              </p>
            </div>

            {selectedItem.result?.short_answer && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                    <Code className="w-4 h-4 text-[#38BDF8]" />
                    <span>{isKm ? 'ចម្លើយខ្លី (សង្ខេប)' : 'Short Answer'}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleCopyText('short', latexToPlainText(selectedItem.result.short_answer))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] hover:bg-white/15 text-white cursor-pointer transition-colors"
                  >
                    {copiedId === 'short' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'short' ? (isKm ? 'បានចម្លង!' : 'Copied!') : (isKm ? 'ចម្លង' : 'Copy')}</span>
                  </button>
                </div>
                <div className="bg-[#1e1e1e] border border-white/15 rounded-xl p-4 sm:p-5 overflow-x-auto terminal-content">
                  <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {selectedItem.result.short_answer}
                  </Markdown>
                </div>
              </div>
            )}

            {selectedItem.result?.detailed_answer && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-[#38BDF8]" />
                    <span>{isKm ? 'ដំណោះស្រាយលម្អិត' : 'Detailed Solution'}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleCopyText('detailed', latexToPlainText(selectedItem.result.detailed_answer))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] hover:bg-white/15 text-white cursor-pointer transition-colors"
                  >
                    {copiedId === 'detailed' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'detailed' ? (isKm ? 'បានចម្លង!' : 'Copied!') : (isKm ? 'ចម្លងដំណោះស្រាយ' : 'Copy')}</span>
                  </button>
                </div>
                <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 sm:p-7 overflow-x-auto">
                  <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-white/95 leading-relaxed font-kh-content">
                    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {selectedItem.result.detailed_answer}
                    </Markdown>
                  </div>
                </div>
              </div>
            )}

            {selectedItem.result?.formulas_used && (
              <div className="space-y-2.5">
                <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2 px-1">
                  <Calculator className="w-4 h-4 text-[#38BDF8]" />
                  <span>{isKm ? 'រូបមន្តដែលបានប្រើ' : 'Formulas Used'}</span>
                </h2>
                <div className="bg-[#1e1e1e] border border-white/15 rounded-xl p-4 sm:p-5 overflow-x-auto terminal-content">
                  <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {selectedItem.result.formulas_used}
                  </Markdown>
                </div>
              </div>
            )}
          </div>
        ) : (
          (() => {
            const res = selectedItem.result || {};
            const metrics = getEssayLengthMetrics(res);
            return (
              <div className="space-y-5">
                <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/75 tabular-nums">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#38BDF8]">
                        <PenLine className="w-3.5 h-3.5" />
                        <span>{res.essay_type_label || (isKm ? 'តែងសេចក្ដី' : 'Essay')}</span>
                      </span>
                      <span>·</span>
                      <span>{getGradeLabel(selectedItem.grade, isKm)}</span>
                      {metrics.wordCount > 0 && (
                        <>
                          <span>·</span>
                          <span>
                            {isKm
                              ? `${toKhmerNumber(metrics.wordCount)} ពាក្យ`
                              : `${metrics.wordCount} words`}
                          </span>
                        </>
                      )}
                      {selectedItem.createdAt && (
                        <>
                          <span>·</span>
                          <span>{formatHistoryDate(selectedItem.createdAt, isKm)}</span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isAlreadyBookmarked}
                      onClick={() => {
                        saveEssayItem(currentUser, {
                          result: res,
                          grade: selectedItem.grade,
                          note: '',
                        });
                        setSavedEssaySyncTick((n) => n + 1);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                        isAlreadyBookmarked
                          ? 'bg-[#38BDF8]/20 text-[#38BDF8] cursor-default'
                          : 'bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] cursor-pointer'
                      }`}
                    >
                      {isAlreadyBookmarked ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>{isKm ? 'បានចំណាំរួចហើយ' : 'Bookmarked'}</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>{isKm ? 'រក្សាទុកក្នុងចំណាំ' : 'Save to Bookmarks'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    {res.detected_topic || selectedItem.promptText}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEssayTab('outline')}
                      className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                        essayTab === 'outline'
                          ? 'bg-white/18 text-white font-semibold'
                          : 'text-white/75 hover:text-white'
                      }`}
                    >
                      <ListOrdered className="w-4 h-4" />
                      <span>{isKm ? 'គម្រោងតែង' : 'Outline'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEssayTab('essay')}
                      className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                        essayTab === 'essay'
                          ? 'bg-white/18 text-white font-semibold'
                          : 'text-white/75 hover:text-white'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>{isKm ? 'សំណេរគំរូ' : 'Model Essay'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        'essay',
                        essayTab === 'outline'
                          ? formatOutlineToPlainText(res)
                          : formatEssayToPlainText(res)
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-white/[0.08] hover:bg-white/15 text-white cursor-pointer transition-colors"
                  >
                    {copiedId === 'essay' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>
                      {copiedId === 'essay'
                        ? isKm
                          ? 'បានចម្លង!'
                          : 'Copied!'
                        : isKm
                        ? 'ចម្លងអត្ថបទ'
                        : 'Copy'}
                    </span>
                  </button>
                </div>

                {essayTab === 'outline' ? (
                  <div className="bg-white/[0.05] rounded-2xl border border-white/10 p-5 sm:p-7 space-y-5 text-sm text-white/90 leading-relaxed">
                    {res.topic_meaning && (
                      <div>
                        <p className="text-xs font-semibold text-[#38BDF8] mb-1">
                          {isKm ? 'ន័យរួមប្រធាន' : 'Topic Meaning'}
                        </p>
                        <p>{res.topic_meaning}</p>
                      </div>
                    )}
                    {res.outline?.introduction && (
                      <div className="space-y-2 pt-3 border-t border-white/10">
                        <p className="font-kh-title text-base text-white">
                          {isKm ? 'សេចក្ដីផ្ដើម' : 'Introduction'}
                        </p>
                        <p>{res.outline.introduction.lead_in}</p>
                        <p>{res.outline.introduction.topic_introduction}</p>
                      </div>
                    )}
                    {res.outline?.body && (
                      <div className="space-y-2 pt-3 border-t border-white/10">
                        <p className="font-kh-title text-base text-white">
                          {isKm ? 'តួសេចក្ដី' : 'Body'}
                        </p>
                        <p>{res.outline.body.thesis_explanation}</p>
                        {res.outline.body.counter_argument && <p>{res.outline.body.counter_argument}</p>}
                        {res.outline.body.synthesis && <p>{res.outline.body.synthesis}</p>}
                      </div>
                    )}
                    {res.outline?.conclusion && (
                      <div className="space-y-2 pt-3 border-t border-white/10">
                        <p className="font-kh-title text-base text-white">
                          {isKm ? 'សេចក្ដីបញ្ចប់' : 'Conclusion'}
                        </p>
                        <p>{res.outline.conclusion.evaluation}</p>
                        <p>{res.outline.conclusion.personal_view}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <article className="bg-white/[0.05] rounded-2xl border border-white/10 p-5 sm:p-8 font-kh-content space-y-5">
                    {(res.annotated_essay || []).map((seg, idx) => (
                      <p key={idx} className="text-sm sm:text-base text-white/95 leading-[1.9] indent-8 text-justify">
                        {seg.content}
                      </p>
                    ))}
                  </article>
                )}
              </div>
            );
          })()
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div id="history-page" className="space-y-5 font-kh-body pb-12">
      <header className="pb-4 border-b border-white/10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-kh-title text-2xl text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-[#38BDF8]" />
            <span>{isKm ? 'ប្រវត្តិសិក្សា' : 'Study History'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-1">
            {isKm
              ? 'លំហាត់ និងតែងសេចក្ដីដែលបានធ្វើរួច រក្សាទុកដោយស្វ័យប្រវត្តិសម្រាប់អាន Offline'
              : 'Automatically saved exercises and essays available offline'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isOnline && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#38BDF8] font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline</span>
            </span>
          )}
          {items.length > 0 && (
            confirmClearAll ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-3 py-1.5 text-xs font-medium bg-white/[0.08] text-white rounded-xl cursor-pointer"
                >
                  {isKm ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-xl cursor-pointer"
                >
                  {isKm ? 'លុបទាំងអស់' : 'Confirm Clear'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/75 hover:text-rose-300 bg-white/[0.06] hover:bg-rose-500/15 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKm ? 'សម្អាតទាំងអស់' : 'Clear All'}</span>
              </button>
            )
          )}
        </div>
      </header>

      {/* Filter & Search Bar */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <LayoutGroup id="history-filter-tabs">
            <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-xl self-start">
              {[
                { id: 'all', label: isKm ? `ទាំងអស់ (${toKhmerNumber(items.length)})` : `All (${items.length})` },
                { id: 'solver', label: isKm ? 'ដោះស្រាយលំហាត់' : 'Solver' },
                { id: 'essay', label: isKm ? 'តែងសេចក្ដី' : 'Essays' },
              ].map((tab) => {
                const isActive = filterKind === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterKind(tab.id)}
                    className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isActive ? 'text-[#38BDF8] font-semibold' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="history-filter-pill"
                        transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.75 }}
                        className="absolute inset-0 rounded-lg bg-[#38BDF8]/18"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKm ? 'ស្វែងរកក្នុងប្រវត្តិ...' : 'Search history...'}
              className="w-full pl-9 pr-8 py-2 bg-white/[0.05] border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#38BDF8]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* History List or Empty State */}
      {items.length === 0 ? (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="font-kh-title text-base sm:text-lg text-white">
              {isKm ? 'មិនទាន់មានប្រវត្តិសិក្សាទេ' : 'No Study History Yet'}
            </h2>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              {isKm
                ? 'រាល់លំហាត់ និងតែងសេចក្ដីដែលអ្នកដោះស្រាយ នឹងត្រូវបានរក្សាទុកដោយស្វ័យប្រវត្តិនៅទីនេះដើម្បីអានពេលគ្មានអ៊ីនធឺណិត។'
                : 'Solved exercises and essays are automatically saved here so you can review them offline.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <Link
              to="/solver"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs font-bold rounded-xl transition-colors"
            >
              <Calculator className="w-4 h-4" />
              <span>{isKm ? 'ដោះស្រាយលំហាត់' : 'Open Solver'}</span>
            </Link>
            <Link
              to="/resource"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/[0.08] hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <PenLine className="w-4 h-4" />
              <span>{isKm ? 'តែងសេចក្ដី' : 'Write Essay'}</span>
            </Link>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-8 text-center text-sm text-white/70">
          {isKm ? 'រកមិនឃើញលទ្ធផលក្នុងប្រវត្តិទេ' : 'No matching history items'}
        </div>
      ) : (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl divide-y divide-white/10 overflow-hidden">
          {filteredItems.map((item) => {
            const isSolver = item.kind === 'solver';
            const title = isSolver
              ? item.promptText || (isKm ? 'លំហាត់ពីរូបភាព' : 'Photo Exercise')
              : item.result?.detected_topic || item.promptText || (isKm ? 'ប្រធានតែងសេចក្ដី' : 'Essay');

            return (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleOpenItem(item.id)}
                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/12 text-[#38BDF8] flex items-center justify-center shrink-0">
                    {isSolver ? (
                      <Calculator className="w-4.5 h-4.5" />
                    ) : (
                      <PenLine className="w-4.5 h-4.5" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-white line-clamp-1 group-hover:underline">
                      {title}
                    </p>
                    <p className="text-xs text-white/65 tabular-nums truncate">
                      {isSolver
                        ? isKm
                          ? 'ដោះស្រាយលំហាត់'
                          : 'Problem Solver'
                        : `${getGradeLabel(item.grade, isKm)}${
                            item.result?.essay_type_label ? ` · ${item.result.essay_type_label}` : ''
                          }`}
                      {item.createdAt ? ` · ${formatHistoryDate(item.createdAt, isKm)}` : ''}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteOne(item.id)}
                  aria-label={isKm ? 'លុប' : 'Delete'}
                  className="p-2 rounded-lg text-white/45 hover:text-rose-300 hover:bg-rose-500/15 transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
