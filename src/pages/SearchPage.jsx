import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search as SearchIcon,
  X,
  BookOpen,
  Bookmark,
  Check,
  ArrowRight,
  AlertCircle,
  WifiOff,
} from 'lucide-react';
import PdfReaderModal from '../components/library/PdfReaderModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/usePWA';
import {
  formatGradeLabel,
  formatFileSize,
  toKhmerNumber,
} from '../data/librarySubjects';
import {
  getOfflineBooksMetadata,
  saveBookOffline,
  removeBookOffline,
  getCachedCoverBlobUrl,
} from '../utils/offlineLibrary';
import {
  getSavedEssays,
  hydrateSavedEssaysFromOfflineDB,
} from '../utils/savedEssays';
import { getGradeLabel } from '../data/essayPresets';

const KHMER_DIGITS_MAP = {
  '០': '0',
  '១': '1',
  '២': '2',
  '៣': '3',
  '៤': '4',
  '៥': '5',
  '៦': '6',
  '៧': '7',
  '៨': '8',
  '៩': '9',
};

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[០-៩]/g, (d) => KHMER_DIGITS_MAP[d] ?? d)
    .trim();
}

export default function SearchPage() {
  const { language } = useLanguage();
  const { currentUser, isAuthenticated, setIsLoginOpen } = useAuth();
  const isKm = language === 'km';
  const isOnline = useOnlineStatus();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all'); // 'all' | 'books' | 'essays'
  const [books, setBooks] = useState([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [offlineMap, setOfflineMap] = useState(() => new Map());
  const [savedEssays, setSavedEssays] = useState(() => getSavedEssays(currentUser));

  const [localCovers, setLocalCovers] = useState({});
  const [coverErrors, setCoverErrors] = useState({});
  const localCoversRef = useRef({});
  const pendingOpenKeyRef = useRef(null);
  const inputRef = useRef(null);

  const [activeBook, setActiveBook] = useState(null);
  const [downloadingMap, setDownloadingMap] = useState({});
  const [actionError, setActionError] = useState(null);

  const syncOfflineState = useCallback(async () => {
    const offlineList = await getOfflineBooksMetadata();
    const map = new Map();
    for (const item of offlineList) {
      if (item?.r2_key) map.set(item.r2_key, item);
    }
    setOfflineMap(map);
    return offlineList;
  }, []);

  useEffect(() => {
    const syncEssays = () => setSavedEssays(getSavedEssays(currentUser));
    syncEssays();
    hydrateSavedEssaysFromOfflineDB(currentUser).then((merged) => {
      if (Array.isArray(merged)) setSavedEssays(merged);
    });
    window.addEventListener('wsd:saved-essays-updated', syncEssays);
    return () => window.removeEventListener('wsd:saved-essays-updated', syncEssays);
  }, [currentUser]);

  useEffect(() => {
    syncOfflineState();
    const onOfflineChange = () => syncOfflineState();
    window.addEventListener('wsd:library-offline-updated', onOfflineChange);
    return () => window.removeEventListener('wsd:library-offline-updated', onOfflineChange);
  }, [syncOfflineState]);

  useEffect(() => {
    let cancelled = false;

    const loadBooks = async () => {
      setIsLoadingBooks(true);
      const offlineList = await syncOfflineState();

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (!cancelled) {
          setBooks(offlineList);
          setIsLoadingBooks(false);
        }
        return;
      }

      try {
        const res = await fetch('/api/library/books');
        if (!res.ok) throw new Error('Failed to load books');
        const data = await res.json();
        const fetched = Array.isArray(data.books) ? data.books : [];
        const byKey = new Map(fetched.map((b) => [b.r2_key, b]));
        for (const off of offlineList) {
          if (off?.r2_key && !byKey.has(off.r2_key)) {
            byKey.set(off.r2_key, off);
          }
        }
        if (!cancelled) setBooks(Array.from(byKey.values()));
      } catch {
        if (!cancelled) setBooks(offlineList);
      } finally {
        if (!cancelled) setIsLoadingBooks(false);
      }
    };

    loadBooks();
    return () => {
      cancelled = true;
    };
  }, [syncOfflineState]);

  // Real quick-search suggestions derived from actual catalog subjects
  const quickSuggestions = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const b of books) {
      const label = b.subject_label;
      if (label && !seen.has(label)) {
        seen.add(label);
        list.push(label);
        if (list.length >= 6) break;
      }
    }
    if (list.length === 0) {
      return isKm
        ? ['គណិតវិទ្យា', 'ភាសាខ្មែរ', 'រូបវិទ្យា', 'គីមីវិទ្យា', 'ថ្នាក់ទី ១២']
        : ['Mathematics', 'Khmer', 'Physics', 'Chemistry', 'Grade 12'];
    }
    return list;
  }, [books, isKm]);

  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);

  const matchedBooks = useMemo(() => {
    if (!normalizedQuery) return [];
    return books.filter((book) => {
      const hay = normalizeSearchText(
        `${book.title} ${book.subject_label} ${book.subject} ${book.grade} ថ្នាក់ទី ${book.grade} grade ${book.grade}`
      );
      return hay.includes(normalizedQuery);
    });
  }, [books, normalizedQuery]);

  const matchedEssays = useMemo(() => {
    if (!normalizedQuery || !isAuthenticated) return [];
    return savedEssays.filter((item) => {
      const hay = normalizeSearchText(
        `${item.essay?.detected_topic || ''} ${item.essay?.essay_type_label || ''} ${item.note || ''} ${item.grade || ''} ${getGradeLabel(item.grade, isKm)}`
      );
      return hay.includes(normalizedQuery);
    });
  }, [savedEssays, normalizedQuery, isAuthenticated, isKm]);

  // Hydrate cached covers for matching books
  useEffect(() => {
    const visibleBooks = matchedBooks.slice(0, 18);
    if (visibleBooks.length === 0) return;
    let cancelled = false;

    const hydrateCovers = async () => {
      const additions = {};
      for (const b of visibleBooks) {
        if (!b?.r2_key || localCoversRef.current[b.r2_key]) continue;
        const cachedUrl = await getCachedCoverBlobUrl(b.r2_key);
        if (cancelled) {
          if (cachedUrl) URL.revokeObjectURL(cachedUrl);
          return;
        }
        if (cachedUrl) additions[b.r2_key] = cachedUrl;
      }
      if (!cancelled && Object.keys(additions).length > 0) {
        localCoversRef.current = { ...localCoversRef.current, ...additions };
        setLocalCovers((prev) => ({ ...prev, ...additions }));
      }
    };

    hydrateCovers();
    return () => {
      cancelled = true;
    };
  }, [matchedBooks]);

  useEffect(() => {
    return () => {
      Object.values(localCoversRef.current).forEach((url) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const handleCoverGenerated = useCallback((r2Key, localUrl, uploadedCoverUrl) => {
    if (localUrl) {
      localCoversRef.current[r2Key] = localUrl;
      setLocalCovers((prev) => ({ ...prev, [r2Key]: localUrl }));
    }
    if (uploadedCoverUrl) {
      setBooks((prev) =>
        prev.map((item) =>
          item.r2_key === r2Key ? { ...item, cover_url: uploadedCoverUrl } : item
        )
      );
    }
  }, []);

  const handleSaveOffline = async (book) => {
    setActionError(null);
    setDownloadingMap((prev) => ({ ...prev, [book.r2_key]: 1 }));
    try {
      await saveBookOffline(book, (pct) => {
        setDownloadingMap((prev) => ({ ...prev, [book.r2_key]: pct }));
      });
      await syncOfflineState();
      return true;
    } catch {
      setActionError(
        isKm
          ? `មិនអាចទាញយក «${book.title}» បានទេ។`
          : `Could not download "${book.title}".`
      );
      return false;
    } finally {
      setDownloadingMap((prev) => {
        const next = { ...prev };
        delete next[book.r2_key];
        return next;
      });
    }
  };

  const handleOpenBook = async (book) => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    if (!book?.r2_key) {
      setActiveBook(book);
      return;
    }

    if (offlineMap.has(book.r2_key)) {
      pendingOpenKeyRef.current = null;
      setActiveBook(book);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActionError(
        isKm
          ? `គ្មានអ៊ីនធឺណិតទេ — សៀវភៅ «${book.title}» មិនទាន់បានទាញយកទុក Offline នៅឡើយទេ។`
          : `You are offline — "${book.title}" has not been downloaded yet.`
      );
      return;
    }

    pendingOpenKeyRef.current = book.r2_key;
    if (typeof downloadingMap[book.r2_key] === 'number') return;

    const saved = await handleSaveOffline(book);
    if (saved && pendingOpenKeyRef.current === book.r2_key) {
      pendingOpenKeyRef.current = null;
      setActiveBook(book);
    }
  };

  const handleRemoveOffline = async (book) => {
    await removeBookOffline(book.r2_key);
    await syncOfflineState();
  };

  const showBooksSection = scope === 'all' || scope === 'books';
  const showEssaysSection = isAuthenticated && (scope === 'all' || scope === 'essays');

  const visibleBooks = showBooksSection ? matchedBooks : [];
  const visibleEssays = showEssaysSection ? matchedEssays : [];
  const totalResults = visibleBooks.length + visibleEssays.length;

  return (
    <div id="search-page" className="space-y-5 font-kh-body pb-10">
      {/* Header & Search Bar */}
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-kh-title text-2xl text-white leading-relaxed">
            {isKm ? 'ស្វែងរក' : 'Search'}
          </h1>
          {!isOnline && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#38BDF8] font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              {isKm ? 'Offline' : 'Offline'}
            </span>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="w-4.5 h-4.5 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isKm
                ? 'ស្វែងរកឈ្មោះសៀវភៅ មុខវិជ្ជា ថ្នាក់ទី (ឧ. ១២) ឬតែងសេចក្ដី...'
                : 'Search textbooks, subjects, grades (e.g. 12), or saved essays...'
            }
            className="w-full pl-10 pr-10 py-3 bg-white/[0.06] border border-white/15 rounded-2xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label={isKm ? 'សម្អាត' : 'Clear search'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scope Switcher */}
        {isAuthenticated && (
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: isKm ? 'ទាំងអស់' : 'All' },
              { id: 'books', label: isKm ? 'សៀវភៅ' : 'Books' },
              { id: 'essays', label: isKm ? 'តែងសេចក្ដីរក្សាទុក' : 'Saved Essays' },
            ].map((tab) => {
              const isActive = scope === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScope(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#38BDF8]/18 text-[#38BDF8] font-semibold'
                      : 'bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.09]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {actionError && (
        <div className="p-3 bg-rose-500/15 border border-rose-400/40 text-rose-200 text-xs rounded-xl flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-white/80 hover:text-white font-semibold cursor-pointer"
          >
            {isKm ? 'បិទ' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Initial State (Empty Query): Quick Suggestions */}
      {!normalizedQuery ? (
        <section className="space-y-4 pt-1">
          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
              {isKm ? 'ស្វែងរករហ័ស' : 'Quick Search'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs sm:text-sm text-white/90 transition-colors cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/55 leading-relaxed">
            {isKm
              ? `កំពុងរៀបចំទិន្នន័យសៀវភៅសរុប ${toKhmerNumber(books.length)} ក្បាល${
                  isAuthenticated && savedEssays.length > 0
                    ? ` និងអត្ថបទតែងសេចក្ដី ${toKhmerNumber(savedEssays.length)} អត្ថបទ`
                    : ''
                }។`
              : `Ready to search ${books.length} textbooks${
                  isAuthenticated && savedEssays.length > 0
                    ? ` and ${savedEssays.length} saved essays`
                    : ''
                }.`}
          </p>
        </section>
      ) : isLoadingBooks && books.length === 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="space-y-2 animate-pulse">
              <div className="w-full aspect-[3/4] rounded-xl bg-white/[0.06] border border-white/10" />
              <div className="h-3 w-3/4 rounded bg-white/[0.08]" />
            </div>
          ))}
        </div>
      ) : totalResults === 0 ? (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-10 text-center space-y-2">
          <SearchIcon className="w-7 h-7 text-white/40 mx-auto" />
          <p className="text-sm font-medium text-white">
            {isKm
              ? `រកមិនឃើញលទ្ធផលសម្រាប់ «${query.trim()}» ទេ`
              : `No results found for "${query.trim()}"`}
          </p>
          <p className="text-xs text-white/60">
            {isKm
              ? 'សាកល្បងស្វែងរកតាមឈ្មោះមុខវិជ្ជា ឬលេខថ្នាក់ (ឧ. គណិតវិទ្យា, ១២)។'
              : 'Try searching by subject name or grade number (e.g. Math, 12).'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Matched Books */}
          {visibleBooks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-kh-title text-base sm:text-lg text-white">
                  {isKm ? 'សៀវភៅសិក្សា' : 'Textbooks'}
                </h2>
                <span className="text-xs text-white/65 tabular-nums">
                  {isKm
                    ? `${toKhmerNumber(visibleBooks.length)} ក្បាល`
                    : `${visibleBooks.length} found`}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {visibleBooks.map((book) => {
                  const isSavedOffline = offlineMap.has(book.r2_key);
                  const progress = downloadingMap[book.r2_key];
                  const isDownloading = typeof progress === 'number';
                  const coverSrc =
                    localCovers[book.r2_key] ||
                    (!coverErrors[book.r2_key] ? book.cover_url || '' : '');
                  const ringRadius = 18;
                  const ringCircumference = 2 * Math.PI * ringRadius;
                  const ringOffset =
                    ringCircumference - ((isDownloading ? progress : 0) / 100) * ringCircumference;

                  return (
                    <article key={book.r2_key} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => handleOpenBook(book)}
                        className="w-full aspect-[3/4] rounded-xl overflow-hidden relative bg-white/[0.06] border border-white/10 shadow-sm cursor-pointer group text-left transition-transform hover:-translate-y-0.5"
                      >
                        {coverSrc ? (
                          <img
                            src={coverSrc}
                            alt={book.title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setCoverErrors((prev) => ({ ...prev, [book.r2_key]: true }))
                            }
                            className="w-full h-full object-cover object-top transition-transform duration-200 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full h-full p-2.5 flex flex-col justify-between bg-transparent">
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-[10px] font-medium text-white/75 truncate">
                                {book.subject_label}
                              </span>
                              <span className="font-kh-title text-sm leading-none tabular-nums text-white shrink-0">
                                {toKhmerNumber(book.grade)}
                              </span>
                            </div>
                            <div className="my-auto flex flex-col items-center justify-center text-center gap-1.5">
                              <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center text-[#38BDF8]">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <p className="font-kh-title text-[11px] text-white leading-snug line-clamp-2">
                                {book.title}
                              </p>
                            </div>
                            <div className="text-[10px] text-white/65 text-center tabular-nums truncate">
                              {formatGradeLabel(book.grade, isKm)}
                            </div>
                          </div>
                        )}

                        {isDownloading && (
                          <div className="absolute inset-0 bg-[#194350]/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-white">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                                <circle
                                  cx="22"
                                  cy="22"
                                  r={ringRadius}
                                  fill="none"
                                  stroke="rgba(255,255,255,0.25)"
                                  strokeWidth="3.5"
                                />
                                <circle
                                  cx="22"
                                  cy="22"
                                  r={ringRadius}
                                  fill="none"
                                  stroke="#38BDF8"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeDasharray={ringCircumference}
                                  strokeDashoffset={ringOffset}
                                  className="transition-all duration-150"
                                />
                              </svg>
                              <span className="absolute text-[11px] font-semibold tabular-nums">
                                {isKm ? `${toKhmerNumber(progress)}%` : `${progress}%`}
                              </span>
                            </div>
                          </div>
                        )}
                      </button>

                      <div className="pt-2 space-y-0.5 min-w-0">
                        <h3
                          onClick={() => handleOpenBook(book)}
                          className="font-kh-title text-xs sm:text-sm text-white leading-snug line-clamp-1 hover:underline cursor-pointer"
                        >
                          {book.title}
                        </h3>
                        <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs text-white/65 tabular-nums">
                          <span className="truncate">
                            {formatGradeLabel(book.grade, isKm)} · {formatFileSize(book.file_size)}
                          </span>
                          {isSavedOffline && !isDownloading && (
                            <Check
                              className="w-3.5 h-3.5 text-emerald-300 shrink-0"
                              aria-label={isKm ? 'បានរក្សាទុក Offline' : 'Saved offline'}
                            />
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Matched Saved Essays */}
          {visibleEssays.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-kh-title text-base sm:text-lg text-white flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-[#38BDF8] shrink-0" />
                  <span>{isKm ? 'តែងសេចក្ដីរក្សាទុក' : 'Saved Essays'}</span>
                </h2>
                <span className="text-xs text-white/65 tabular-nums">
                  {isKm
                    ? `${toKhmerNumber(visibleEssays.length)} អត្ថបទ`
                    : `${visibleEssays.length} found`}
                </span>
              </div>

              <div className="bg-white/[0.05] border border-white/10 rounded-2xl divide-y divide-white/10 overflow-hidden">
                {visibleEssays.map((item) => (
                  <Link
                    key={item.id}
                    to="/profile?view=bookmark"
                    className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold text-white line-clamp-1 group-hover:underline">
                        {item.essay?.detected_topic || (isKm ? 'ប្រធានតែងសេចក្ដី' : 'Essay Prompt')}
                      </p>
                      <p className="text-xs text-white/65 tabular-nums truncate">
                        {getGradeLabel(item.grade, isKm)}
                        {item.essay?.essay_type_label ? ` · ${item.essay.essay_type_label}` : ''}
                        {item.wordCount
                          ? ` · ${isKm ? `${toKhmerNumber(item.wordCount)} ពាក្យ` : `${item.wordCount} words`}`
                          : ''}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-[#38BDF8] shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* In-App PDF Reader Modal */}
      {activeBook && (
        <PdfReaderModal
          book={activeBook}
          isKm={isKm}
          isOfflineSaved={offlineMap.has(activeBook.r2_key)}
          downloadProgress={downloadingMap[activeBook.r2_key] ?? null}
          onClose={() => setActiveBook(null)}
          onSaveOffline={handleSaveOffline}
          onRemoveOffline={handleRemoveOffline}
          onCoverGenerated={handleCoverGenerated}
        />
      )}
    </div>
  );
}
