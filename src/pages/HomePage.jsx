import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calculator,
  PenLine,
  Library,
  BookOpen,
  ArrowRight,
  UserPlus,
  LogIn,
  Check,
  WifiOff,
  AlertCircle,
  Search,
  X,
  Clock,
  LayoutGrid,
} from 'lucide-react';
import Button from '../components/common/Button';
import DotsLoader from '../components/common/DotsLoader';
import PdfReaderModal from '../components/library/PdfReaderModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/usePWA';
import {
  formatGradeLabel,
  formatGradeBadgeNumber,
  formatFileSize,
  toKhmerNumber,
} from '../data/librarySubjects';
import {
  getOfflineBooksMetadata,
  saveBookOffline,
  removeBookOffline,
  getCachedCoverBlobUrl,
  getCachedBookCatalog,
  saveCachedBookCatalog,
  mergeBooksWithOffline,
} from '../utils/offlineLibrary';
import {
  getSavedEssays,
  hydrateSavedEssaysFromOfflineDB,
} from '../utils/savedEssays';

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

function parseStudentGradeNumber(rawGrade) {
  if (!rawGrade) return null;
  const normalized = String(rawGrade).replace(/[០-៩]/g, (d) => KHMER_DIGITS_MAP[d] ?? d);
  const match = normalized.match(/\b(1[0-2]|[4-9])\b/) || normalized.match(/(1[0-2]|[4-9])/);
  return match ? Number(match[1]) : null;
}

const PUBLIC_STATS_CACHE_KEY = 'wsd_public_stats_cache_v1';

const HERO_SUBJECTS = [
  { id: 'math', labelKm: 'គណិតវិទ្យា', labelEn: 'Mathematics' },
  { id: 'khmer', labelKm: 'ភាសាខ្មែរ', labelEn: 'Khmer' },
  { id: 'english', labelKm: 'ភាសាអង់គ្លេស', labelEn: 'English' },
  { id: 'science', labelKm: 'វិទ្យាសាស្ត្រ', labelEn: 'Science' },
  { id: 'physics', labelKm: 'រូបវិទ្យា', labelEn: 'Physics' },
  { id: 'chemistry', labelKm: 'គីមីវិទ្យា', labelEn: 'Chemistry' },
  { id: 'history', labelKm: 'ប្រវត្តិវិទ្យា', labelEn: 'History' },
  { id: 'ict', labelKm: 'ព័ត៌មានវិទ្យា', labelEn: 'ICT' },
];

function readCachedPublicStats() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PUBLIC_STATS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const {
    currentUser,
    isAuthenticated,
    setIsRegisterOpen,
    setIsLoginOpen,
  } = useAuth();
  const isKm = language === 'km';
  const isOnline = useOnlineStatus();

  const [heroQuery, setHeroQuery] = useState('');
  const [heroScope, setHeroScope] = useState('all');
  const [publicStats, setPublicStats] = useState(() => readCachedPublicStats() || {
    studentCount: 0,
    bookCount: 0,
    subjectCount: 0,
    gradeCount: 9,
  });

  const [books, setBooks] = useState([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [offlineMap, setOfflineMap] = useState(() => new Map());
  const [offlineCount, setOfflineCount] = useState(0);
  const [savedEssayCount, setSavedEssayCount] = useState(() => getSavedEssays(currentUser).length);

  const [localCovers, setLocalCovers] = useState({});
  const [coverErrors, setCoverErrors] = useState({});
  const localCoversRef = useRef({});
  const pendingOpenKeyRef = useRef(null);

  const [activeBook, setActiveBook] = useState(null);
  const [downloadingMap, setDownloadingMap] = useState({});
  const [actionError, setActionError] = useState(null);

  const studentGradeNumber = useMemo(
    () => parseStudentGradeNumber(currentUser?.grade),
    [currentUser?.grade]
  );

  const syncOfflineState = useCallback(async () => {
    const offlineList = await getOfflineBooksMetadata();
    const map = new Map();
    for (const item of offlineList) {
      if (item?.r2_key) map.set(item.r2_key, item);
    }
    setOfflineMap(map);
    setOfflineCount(offlineList.length);
    return offlineList;
  }, []);

  useEffect(() => {
    const syncEssays = () => setSavedEssayCount(getSavedEssays(currentUser).length);
    syncEssays();
    hydrateSavedEssaysFromOfflineDB(currentUser).then((merged) => {
      if (Array.isArray(merged)) setSavedEssayCount(merged.length);
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

    const loadCatalog = async () => {
      const offlineList = await syncOfflineState();
      const cachedCatalog = getCachedBookCatalog();
      const cachedMerged = mergeBooksWithOffline(cachedCatalog, offlineList);

      if (cachedMerged.length > 0 && !cancelled) {
        setBooks(cachedMerged);
        setIsLoadingBooks(false);
      } else {
        setIsLoadingBooks(true);
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (!cancelled) {
          setBooks(cachedMerged);
          setIsLoadingBooks(false);
        }
        return;
      }

      try {
        const res = await fetch('/api/library/books');
        if (!res.ok) throw new Error('Failed to load books');
        const data = await res.json();
        const fetchedBooks = Array.isArray(data.books) ? data.books : [];
        saveCachedBookCatalog(fetchedBooks);
        const merged = mergeBooksWithOffline(fetchedBooks, offlineList);

        if (!cancelled) {
          setBooks(merged);
        }
      } catch {
        if (!cancelled) {
          setBooks(cachedMerged);
        }
      } finally {
        if (!cancelled) setIsLoadingBooks(false);
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [syncOfflineState]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    let cancelled = false;
    fetch('/api/public/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok) {
          const next = {
            studentCount: Number(data.studentCount || 0),
            bookCount: Number(data.bookCount || 0),
            subjectCount: Number(data.subjectCount || 0),
            gradeCount: Number(data.gradeCount || 9),
          };
          setPublicStats(next);
          try {
            localStorage.setItem(PUBLIC_STATS_CACHE_KEY, JSON.stringify(next));
          } catch {
            // Ignore storage errors
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const displayStats = useMemo(() => {
    const subjectSet = new Set();
    const gradeSet = new Set();
    for (const b of books) {
      if (b?.subject) subjectSet.add(b.subject);
      const g = Number(b?.grade);
      if (Number.isFinite(g) && g >= 4 && g <= 12) gradeSet.add(g);
    }
    return {
      studentCount: publicStats.studentCount || 0,
      bookCount: books.length > 0 ? books.length : publicStats.bookCount || 0,
      subjectCount: subjectSet.size > 0 ? subjectSet.size : publicStats.subjectCount || 0,
      gradeCount: gradeSet.size > 0 ? gradeSet.size : publicStats.gradeCount || 9,
    };
  }, [books, publicStats]);

  const handleHeroSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = heroQuery.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (heroScope && heroScope !== 'all') params.set('scope', heroScope);
    const qs = params.toString();
    navigate(qs ? `/search?${qs}` : '/search');
  };

  const handleSubjectChipClick = (sub) => {
    const hasSubjectInLibrary = books.some((b) => b.subject === sub.id);
    if (isAuthenticated && hasSubjectInLibrary) {
      navigate(`/library?subject=${encodeURIComponent(sub.id)}`);
      return;
    }
    const label = isKm ? sub.labelKm : sub.labelEn;
    navigate(`/search?q=${encodeURIComponent(label)}&scope=books`);
  };

  const { latestBooks, featuredBooks, isGradeSpecificShelf } = useMemo(() => {
    if (books.length === 0) {
      return { latestBooks: [], featuredBooks: [], isGradeSpecificShelf: false };
    }

    const byNewest = [...books].sort((a, b) => {
      const tA = new Date(a?.last_modified || 0).getTime();
      const tB = new Date(b?.last_modified || 0).getTime();
      if (tB !== tA) return tB - tA;
      return String(a?.title || '').localeCompare(String(b?.title || ''), 'km');
    });
    const latestSlice = byNewest.slice(0, 10);
    const latestKeys = new Set(latestSlice.map((b) => b.r2_key));

    const scoreBook = (b) => {
      const hasCover = Boolean(localCovers[b.r2_key] || (b.cover_url && !coverErrors[b.r2_key]));
      const isGradeMatch = studentGradeNumber !== null && Number(b.grade) === studentGradeNumber;
      const isOffline = offlineMap.has(b.r2_key);
      return (isGradeMatch ? 10 : 0) + (hasCover ? 3 : 0) + (isOffline ? 1 : 0);
    };

    const gradeMatches =
      studentGradeNumber !== null
        ? books.filter((b) => Number(b.grade) === studentGradeNumber)
        : [];

    const nonDuplicatePool = books.filter((b) => !latestKeys.has(b.r2_key));
    const corePool = nonDuplicatePool.length >= 10 || gradeMatches.length > 0 ? nonDuplicatePool : books;
    const sortedCore = [...corePool].sort((a, b) => scoreBook(b) - scoreBook(a));
    const featuredSlice =
      sortedCore.length >= 10
        ? sortedCore.slice(0, 10)
        : [...books].sort((a, b) => scoreBook(b) - scoreBook(a)).slice(0, 10);

    return {
      latestBooks: latestSlice,
      featuredBooks: featuredSlice,
      isGradeSpecificShelf: gradeMatches.length >= 2,
    };
  }, [books, studentGradeNumber, offlineMap, localCovers, coverErrors]);

  useEffect(() => {
    const combined = [...latestBooks, ...featuredBooks];
    if (combined.length === 0) return;
    let cancelled = false;

    const hydrateCovers = async () => {
      const additions = {};
      for (const b of combined) {
        if (!b?.r2_key || localCoversRef.current[b.r2_key] || additions[b.r2_key]) continue;
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
  }, [latestBooks, featuredBooks]);

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
          ? `គ្មានអ៊ីនធឺណិតទេ — សៀវភៅ «${book.title}» មិនទាន់បានទាញយកនៅឡើយទេ។`
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

  const quickTools = [
    {
      to: '/solver',
      icon: Calculator,
      title: isKm ? 'ដោះស្រាយលំហាត់' : 'Problem Solver',
      desc: isKm ? 'ថតរូប ឬវាយប្រធានលំហាត់' : 'Text or photo step-by-step',
    },
    {
      to: '/resource',
      icon: PenLine,
      title: isKm ? 'តែងសេចក្ដី' : 'Essay Writing',
      desc: isKm ? 'គម្រោងតែង និងគំរូអត្ថបទ' : 'Structured outlines & essays',
    },
    {
      to: '/library',
      icon: Library,
      title: isKm ? 'បណ្ណាល័យ' : 'Library',
      desc: isKm ? 'សៀវភៅសិក្សាថ្នាក់ទី ៤–១២' : 'Grades 4–12 offline textbooks',
    },
  ];

  return (
    <div id="home-page" className="space-y-7 font-kh-body pb-8">
      {/* 1. Hero Section */}
      <section
        id="home-hero"
        className="relative pt-2 pb-5 sm:pt-5 sm:pb-7 text-center space-y-6 px-1 sm:px-2"
      >
        <div className="space-y-2.5 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 text-[11px] sm:text-xs font-semibold tracking-[0.22em] text-white/70 uppercase">
            <span className="w-6 sm:w-8 h-px bg-white/25" />
            <span>WSD ACADEMY</span>
            <span className="w-6 sm:w-8 h-px bg-white/25" />
          </div>

          <h1 className="font-kh-title text-3xl sm:text-5xl text-white tracking-wide leading-tight text-balance">
            {isKm ? 'កម្មវិធីសិក្សាឌីជីថល' : 'Digital Learning Program'}
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
            {isKm
              ? 'សម្រាប់សិស្សានុសិស្សទាំង៣កម្រិត បឋមសិក្សា អនុវិទ្យាល័យ វិទ្យាល័យ'
              : 'For students across all 3 levels: Primary, Lower Secondary, and Upper Secondary'}
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-2xl mx-auto w-full">
          <form
            onSubmit={handleHeroSearchSubmit}
            className="w-full bg-white rounded-full p-1.5 pl-4 sm:pl-5 shadow-lg flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#D4952A]/50 transition-shadow"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)}
              placeholder={
                isKm
                  ? 'ស្វែងរក សៀវភៅ លំហាត់ ឬអត្ថបទ...'
                  : 'Search books, exercises, or essays...'
              }
              aria-label={isKm ? 'ស្វែងរក' : 'Search'}
              className="flex-1 min-w-0 bg-transparent text-slate-800 placeholder:text-slate-400 text-xs sm:text-sm py-1.5 focus:outline-none"
            />
            {heroQuery && (
              <button
                type="button"
                onClick={() => setHeroQuery('')}
                aria-label={isKm ? 'សម្អាត' : 'Clear'}
                className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 inline-flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="hidden sm:flex items-center border-l border-slate-200 pl-3 pr-1 shrink-0">
              <select
                value={heroScope}
                onChange={(e) => setHeroScope(e.target.value)}
                aria-label={isKm ? 'ប្រភេទស្វែងរក' : 'Search scope'}
                className="text-xs font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer py-1"
              >
                <option value="all">{isKm ? 'ពេញនិយម' : 'Popular'}</option>
                <option value="books">{isKm ? 'សៀវភៅ' : 'Books'}</option>
                <option value="essays">{isKm ? 'តែងសេចក្ដី' : 'Essays'}</option>
                <option value="history">{isKm ? 'ប្រវត្តិសិក្សា' : 'History'}</option>
              </select>
            </div>

            <button
              type="submit"
              className="bg-[#D4952A] hover:bg-[#BE8320] text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-full inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>{isKm ? 'ស្វែងរក' : 'Search'}</span>
            </button>
          </form>
        </div>

        {/* Subjects Single Horizontal Row */}
        <div className="max-w-4xl mx-auto w-full overflow-x-auto py-0.5">
          <div className="inline-flex sm:flex items-center sm:justify-center flex-nowrap gap-1.5 sm:gap-2 min-w-max sm:min-w-0 px-1">
            <span className="text-[11px] sm:text-xs text-white/60 font-medium mr-1 whitespace-nowrap shrink-0">
              {isKm ? 'មុខវិជ្ជា' : 'Subjects'}
            </span>
            {HERO_SUBJECTS.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleSubjectChipClick(sub)}
                className="px-2.5 sm:px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.14] border border-white/15 text-[11px] sm:text-xs text-white/85 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isKm ? sub.labelKm : sub.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* 4-Column Single-Row Platform Stats Bar */}
        <div className="max-w-4xl mx-auto w-full rounded-2xl bg-white/[0.05] border border-white/12 grid grid-cols-4 divide-x divide-white/10 overflow-hidden">
          {[
            {
              value: displayStats.studentCount,
              plus: true,
              label: isKm ? 'សិស្សានុសិស្ស' : 'Students',
            },
            {
              value: displayStats.bookCount,
              plus: true,
              label: isKm ? 'សៀវភៅ' : 'Books',
            },
            {
              value: displayStats.subjectCount,
              plus: true,
              label: isKm ? 'មុខវិជ្ជា' : 'Subjects',
            },
            {
              value: displayStats.gradeCount,
              plus: false,
              label: isKm ? 'ថ្នាក់សិក្សា' : 'Grades 4–12',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="py-3.5 sm:py-5 px-1.5 sm:px-3 flex flex-col items-center justify-center text-center gap-1 min-w-0"
            >
              <div className="font-kh-title text-lg sm:text-3xl text-white tabular-nums tracking-wide leading-none flex items-start">
                <span>{Number(item.value || 0).toLocaleString()}</span>
                {item.plus && (
                  <span className="text-xs sm:text-base font-bold text-[#F59E0B] ml-0.5 -mt-0.5">+</span>
                )}
              </div>
              <span className="text-[10px] sm:text-xs text-white/75 font-medium whitespace-nowrap truncate max-w-full">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Guest Auth Bar */}
      {!isAuthenticated && (
        <div className="pt-4 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-white/75">
              {isKm
                ? 'ចូលគណនី ឬចុះឈ្មោះដើម្បីបើកអានសៀវភៅ និងរក្សាទុកមេរៀនរបស់អ្នក។'
                : 'Sign in or register to read textbooks and save your lessons.'}
            </p>
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="primary"
                size="sm"
                leftIcon={UserPlus}
                onClick={() => setIsRegisterOpen(true)}
              >
                {isKm ? 'ចុះឈ្មោះ' : 'Register'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={LogIn}
                onClick={() => setIsLoginOpen(true)}
              >
                {isKm ? 'ចូលគណនី' : 'Sign In'}
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* 2. Latest Textbooks (5-column Desktop showcase grid) */}
      {(isLoadingBooks || latestBooks.length > 0) && (
        <section className="space-y-4 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] inline-flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="font-kh-title text-lg sm:text-xl text-white">
                {isKm ? 'សៀវភៅថ្មីចុងក្រោយ' : 'Latest Textbooks'}
              </h2>
            </div>
            <Link
              to="/library"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-medium text-white/90 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{isKm ? 'បង្ហាញទាំងអស់' : 'View all'}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>

          {isLoadingBooks ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center py-1">
                <DotsLoader
                  size="sm"
                  color="accent"
                  label={isKm ? 'កំពុងផ្ទុកសៀវភៅ...' : 'Loading textbooks...'}
                  className="text-xs text-white/70"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden animate-pulse flex-col ${
                      idx >= 4 ? 'hidden md:flex' : 'flex'
                    }`}
                  >
                    <div className="w-full aspect-[3/4] bg-white/[0.06]" />
                    <div className="p-3 space-y-2">
                      <div className="h-3.5 w-3/4 rounded bg-white/[0.08]" />
                      <div className="h-3 w-1/2 rounded bg-white/[0.05]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {latestBooks.map((book, idx) => {
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
                  <article
                    key={`latest-${book.r2_key}`}
                    className={`bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl overflow-hidden flex-col transition-all duration-200 hover:-translate-y-0.5 shadow-sm group ${
                      idx >= 4 ? 'hidden md:flex' : 'flex'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenBook(book)}
                      className="w-full aspect-[3/4] overflow-hidden relative bg-white/[0.05] cursor-pointer text-left"
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
                        <div className="w-full h-full p-3 flex flex-col justify-between bg-transparent">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[11px] font-medium text-white/75 truncate">
                              {book.subject_label}
                            </span>
                            <span className="font-kh-title text-sm sm:text-base leading-none tabular-nums text-white shrink-0">
                              {formatGradeBadgeNumber(book.grade, isKm)}
                            </span>
                          </div>
                          <div className="my-auto flex flex-col items-center justify-center text-center gap-1.5">
                            <div className="w-9 h-9 rounded-lg bg-white/[0.08] flex items-center justify-center text-[#38BDF8]">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <p className="font-kh-title text-xs text-white leading-snug line-clamp-2">
                              {book.title}
                            </p>
                          </div>
                          <div className="text-[11px] text-white/65 text-center tabular-nums truncate">
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

                    <div className="p-3 flex-1 flex flex-col justify-between gap-2 min-w-0">
                      <div className="space-y-1 min-w-0">
                        <h3
                          onClick={() => handleOpenBook(book)}
                          className="font-kh-title text-xs sm:text-sm text-white leading-snug line-clamp-2 hover:underline cursor-pointer"
                        >
                          {book.title}
                        </h3>
                        <p className="text-[11px] text-white/65 truncate">
                          {book.subject_label} · {formatGradeLabel(book.grade, isKm)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-white/60 tabular-nums">
                        <span>{formatFileSize(book.file_size)}</span>
                        {isSavedOffline && !isDownloading ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
                            <Check className="w-3 h-3 shrink-0" />
                            <span>{isKm ? 'បានទាញយក' : 'Downloaded'}</span>
                          </span>
                        ) : !isOnline && !isDownloading ? (
                          <WifiOff
                            className="w-3 h-3 text-white/40 shrink-0"
                            aria-label={isKm ? 'ត្រូវការអ៊ីនធឺណិតដើម្បីទាញយក' : 'Internet required to download'}
                          />
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 3. Recommended / Core Textbooks (5-column Desktop showcase grid) */}
      {!isLoadingBooks && featuredBooks.length > 0 && (
        <section className="space-y-4 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8] inline-flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </span>
              <h2 className="font-kh-title text-lg sm:text-xl text-white">
                {isGradeSpecificShelf && studentGradeNumber
                  ? isKm
                    ? `សៀវភៅសម្រាប់${formatGradeLabel(studentGradeNumber, true)}`
                    : `Books for ${formatGradeLabel(studentGradeNumber, false)}`
                  : isKm
                  ? 'សៀវភៅសិក្សាគោល'
                  : 'Core Textbooks'}
              </h2>
            </div>
            <Link
              to="/library"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-medium text-white/90 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{isKm ? 'បង្ហាញទាំងអស់' : 'View all'}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {featuredBooks.map((book, idx) => {
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
                <article
                  key={`featured-${book.r2_key}`}
                  className={`bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl overflow-hidden flex-col transition-all duration-200 hover:-translate-y-0.5 shadow-sm group ${
                    idx >= 4 ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenBook(book)}
                    className="w-full aspect-[3/4] overflow-hidden relative bg-white/[0.05] cursor-pointer text-left"
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
                      <div className="w-full h-full p-3 flex flex-col justify-between bg-transparent">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[11px] font-medium text-white/75 truncate">
                            {book.subject_label}
                          </span>
                          <span className="font-kh-title text-sm sm:text-base leading-none tabular-nums text-white shrink-0">
                            {formatGradeBadgeNumber(book.grade, isKm)}
                          </span>
                        </div>
                        <div className="my-auto flex flex-col items-center justify-center text-center gap-1.5">
                          <div className="w-9 h-9 rounded-lg bg-white/[0.08] flex items-center justify-center text-[#38BDF8]">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <p className="font-kh-title text-xs text-white leading-snug line-clamp-2">
                            {book.title}
                          </p>
                        </div>
                        <div className="text-[11px] text-white/65 text-center tabular-nums truncate">
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

                  <div className="p-3 flex-1 flex flex-col justify-between gap-2 min-w-0">
                    <div className="space-y-1 min-w-0">
                      <h3
                        onClick={() => handleOpenBook(book)}
                        className="font-kh-title text-xs sm:text-sm text-white leading-snug line-clamp-2 hover:underline cursor-pointer"
                      >
                        {book.title}
                      </h3>
                      <p className="text-[11px] text-white/65 truncate">
                        {book.subject_label} · {formatGradeLabel(book.grade, isKm)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-white/60 tabular-nums">
                      <span>{formatFileSize(book.file_size)}</span>
                      {isSavedOffline && !isDownloading ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
                          <Check className="w-3 h-3 shrink-0" />
                          <span>{isKm ? 'បានទាញយក' : 'Downloaded'}</span>
                        </span>
                      ) : !isOnline && !isDownloading ? (
                        <WifiOff
                          className="w-3 h-3 text-white/40 shrink-0"
                          aria-label={isKm ? 'ត្រូវការអ៊ីនធឺណិតដើម្បីទាញយក' : 'Internet required to download'}
                        />
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Study Shortcuts (Real Existing Tools) */}
      <section className="space-y-4 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-emerald-400/15 text-emerald-300 inline-flex items-center justify-center shrink-0">
            <LayoutGrid className="w-4 h-4" />
          </span>
          <h2 className="font-kh-title text-lg sm:text-xl text-white">
            {isKm ? 'មុខងារសិក្សា' : 'Study Tools'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {quickTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.to}
                to={tool.to}
                className="group bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.985]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/12 text-[#38BDF8] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-kh-title text-sm lg:text-base text-white leading-snug">
                      {tool.title}
                    </h3>
                    <p className="text-[11px] lg:text-xs text-white/65 truncate mt-0.5">{tool.desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-[#38BDF8] group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. Subtle Single-Line Saved Collection Links (Only when student has saved items) */}
      {isAuthenticated && (offlineCount > 0 || savedEssayCount > 0) && (
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/75">
          {offlineCount > 0 && (
            <Link
              to="/downloads"
              className="hover:text-[#38BDF8] transition-colors inline-flex items-center gap-1.5 tabular-nums"
            >
              <span>
                {isKm
                  ? `សៀវភៅបានទាញយក · ${toKhmerNumber(offlineCount)} ក្បាល`
                  : `Downloaded books · ${offlineCount}`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          {savedEssayCount > 0 && (
            <Link
              to="/profile?view=bookmark"
              className="hover:text-[#38BDF8] transition-colors inline-flex items-center gap-1.5 tabular-nums"
            >
              <span>
                {isKm
                  ? `តែងសេចក្ដីរក្សាទុក · ${toKhmerNumber(savedEssayCount)} អត្ថបទ`
                  : `Saved essays · ${savedEssayCount}`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
