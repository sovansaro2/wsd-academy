import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, LayoutGroup } from 'motion/react';
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Check,
  WifiOff,
  AlertCircle,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  ArrowLeft,
  Shuffle,
  Globe2,
} from 'lucide-react';
import DotsLoader from '../components/common/DotsLoader';
import AuthRequiredBanner from '../components/auth/AuthRequiredBanner';
import PdfReaderModal from '../components/library/PdfReaderModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/usePWA';
import bannerSlideReading from '../assets/images/library_banner_reading_1794938531308.jpg';
import bannerSlideScience from '../assets/images/library_banner_science_1794938531773.jpg';
import bannerSlideDigital from '../assets/images/library_banner_digital_1794938532459.jpg';
import {
  LIBRARY_LEVELS,
  LIBRARY_GRADES,
  formatGradeLabel,
  formatGradeBadgeNumber,
  formatFileSize,
  getSubjectTheme,
  toKhmerNumber,
} from '../data/librarySubjects';
import {
  getOfflineBooksMetadata,
  saveBookOffline,
  removeBookOffline,
  getBookmarkedKeys,
  toggleBookBookmark,
  getCachedCoverBlobUrl,
  getCachedBookCatalog,
  saveCachedBookCatalog,
  mergeBooksWithOffline,
} from '../utils/offlineLibrary';
import { extractAndStoreBookCover } from '../utils/pdfClient';

const SUBJECT_ORDER = [
  'khmer',
  'math',
  'english',
  'physics',
  'chemistry',
  'biology',
  'earth',
  'science',
  'history',
  'geography',
  'civics',
  'social',
  'economics',
  'french',
  'ict',
  'home_economics',
  'general',
  'general_knowledge',
];

const HERO_SLIDES = [
  {
    id: 'reading',
    image: bannerSlideReading,
    titleKm: 'បណ្ណាល័យសៀវភៅសិក្សាឌីជីថល',
    titleEn: 'Digital Textbook Library',
    subtitleKm: 'សៀវភៅសិក្សាគោលថ្នាក់ទី ៤ ដល់ទី ១២ គ្រប់មុខវិជ្ជា',
    subtitleEn: 'Core MoEYS textbooks for Grades 4 to 12',
  },
  {
    id: 'science',
    image: bannerSlideScience,
    titleKm: 'រៀបចំតាមមុខវិជ្ជា និងកម្រិតថ្នាក់',
    titleEn: 'Organized by Subject & Grade',
    subtitleKm: 'ងាយស្រួលស្វែងរកសៀវភៅគណិត ភាសាខ្មែរ និងវិទ្យាសាស្ត្រ',
    subtitleEn: 'Explore Mathematics, Khmer Literature, and Sciences effortlessly',
  },
  {
    id: 'digital',
    image: bannerSlideDigital,
    titleKm: 'រក្សាទុកអាន Offline គ្រប់ទីកន្លែង',
    titleEn: 'Save Books for Offline Reading',
    subtitleKm: 'ទាញយកទុកក្នុងឧបករណ៍ ឬចំណាំសៀវភៅសំខាន់ៗទុកអានពេលក្រោយ',
    subtitleEn: 'Cache books locally and bookmark favorites anytime',
  },
];

export default function LibraryPage() {
  const { language } = useLanguage();
  const { isAuthenticated, isAdmin, currentUser } = useAuth();
  const isKm = language === 'km';
  const isOnline = useOnlineStatus();

  const [books, setBooks] = useState([]);
  const [offlineMap, setOfflineMap] = useState(new Map());
  const [bookmarkedKeys, setBookmarkedKeys] = useState([]);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchParams] = useSearchParams();
  const initialSubjectParam = searchParams.get('subject') || 'all';
  const initialLevelParam = searchParams.get('level') || 'all';

  const [selectedLevel, setSelectedLevel] = useState(initialLevelParam);
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState(initialSubjectParam);
  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false);
  const subjectDropdownRef = useRef(null);

  useEffect(() => {
    const paramSubject = searchParams.get('subject');
    const paramLevel = searchParams.get('level');
    if (paramSubject) {
      setSelectedSubject(paramSubject);
      setSelectedLevel('all');
      setSelectedGrade('all');
      setShowAllBooksFlat(false);
    } else if (paramLevel) {
      setSelectedLevel(paramLevel);
    }
  }, [searchParams]);

  const [activeSlide, setActiveSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);
  const touchStartXRef = useRef(null);
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Date.now() / 120000));
  const [showAllBooksFlat, setShowAllBooksFlat] = useState(false);

  const [activeBook, setActiveBook] = useState(null);
  const [downloadingMap, setDownloadingMap] = useState({});
  const [actionError, setActionError] = useState(null);
  const [localCovers, setLocalCovers] = useState({});
  const [coverErrors, setCoverErrors] = useState({});
  const [extractingCoverKeys, setExtractingCoverKeys] = useState({});
  const attemptedCoverKeysRef = useRef(new Set());
  const localCoversRef = useRef({});
  const pendingOpenKeyRef = useRef(null);

  const refreshOfflineAndBookmarks = useCallback(async () => {
    const offlineList = await getOfflineBooksMetadata();
    const map = new Map();
    for (const item of offlineList) {
      if (item?.r2_key) map.set(item.r2_key, item);
    }
    setOfflineMap(map);
    setBookmarkedKeys(getBookmarkedKeys(currentUser));
    return offlineList;
  }, [currentUser]);

  const loadBooks = useCallback(async () => {
    setError(null);
    const offlineList = await refreshOfflineAndBookmarks();
    const cachedCatalog = getCachedBookCatalog();
    const cachedMerged = mergeBooksWithOffline(cachedCatalog, offlineList);

    if (cachedMerged.length > 0) {
      setBooks(cachedMerged);
      setIsConfigured(true);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setBooks(cachedMerged);
      setIsConfigured(true);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/library/books');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load library books.');
      }

      setIsConfigured(Boolean(data.configured));
      const fetchedBooks = Array.isArray(data.books) ? data.books : [];
      saveCachedBookCatalog(fetchedBooks);
      setBooks(mergeBooksWithOffline(fetchedBooks, offlineList));
    } catch (err) {
      // Fallback gracefully to cached catalog + offline downloaded books if network fails
      if (cachedMerged.length > 0) {
        setBooks(cachedMerged);
        setIsConfigured(true);
      } else {
        setError(err?.message || (isKm ? 'មិនអាចទាញបញ្ជីសៀវភៅបានទេ។' : 'Unable to load library books.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshOfflineAndBookmarks, isKm]);

  useEffect(() => {
    if (isAuthenticated) {
      loadBooks();
    }
  }, [isAuthenticated, loadBooks]);

  useEffect(() => {
    const onOfflineChange = () => refreshOfflineAndBookmarks();
    const onBookmarksChange = () => setBookmarkedKeys(getBookmarkedKeys(currentUser));
    window.addEventListener('wsd:library-offline-updated', onOfflineChange);
    window.addEventListener('wsd:library-bookmarks-updated', onBookmarksChange);
    return () => {
      window.removeEventListener('wsd:library-offline-updated', onOfflineChange);
      window.removeEventListener('wsd:library-bookmarks-updated', onBookmarksChange);
    };
  }, [currentUser, refreshOfflineAndBookmarks]);

  const availableGrades = useMemo(() => {
    if (selectedLevel === 'primary') return [4, 5, 6];
    if (selectedLevel === 'lower_secondary') return [7, 8, 9];
    if (selectedLevel === 'upper_secondary') return [10, 11, 12];
    if (selectedLevel === 'general_knowledge') return [];
    return LIBRARY_GRADES;
  }, [selectedLevel]);

  const { availableSubjects, subjectFilterTotal } = useMemo(() => {
    const subjectMap = new Map();
    let totalCount = 0;

    for (const book of books) {
      if (selectedLevel === 'saved' && !bookmarkedKeys.includes(book.r2_key)) continue;
      if (
        (selectedLevel === 'primary' ||
          selectedLevel === 'lower_secondary' ||
          selectedLevel === 'upper_secondary' ||
          selectedLevel === 'general_knowledge') &&
        book.level !== selectedLevel
      ) {
        continue;
      }
      if (selectedGrade !== 'all' && Number(book.grade) !== Number(selectedGrade)) continue;

      totalCount += 1;
      const subKey = book.subject || 'general';
      if (!subjectMap.has(subKey)) {
        subjectMap.set(subKey, {
          id: subKey,
          label: book.subject_label || subKey,
          count: 0,
        });
      }
      subjectMap.get(subKey).count += 1;
    }

    const sorted = Array.from(subjectMap.values()).sort((a, b) => {
      const idxA = SUBJECT_ORDER.indexOf(a.id);
      const idxB = SUBJECT_ORDER.indexOf(b.id);
      const rankA = idxA === -1 ? 999 : idxA;
      const rankB = idxB === -1 ? 999 : idxB;
      if (rankA !== rankB) return rankA - rankB;
      return a.label.localeCompare(b.label, 'km');
    });

    return { availableSubjects: sorted, subjectFilterTotal: totalCount };
  }, [books, bookmarkedKeys, selectedGrade, selectedLevel]);

  // Close subject dropdown on outside click or Escape key
  useEffect(() => {
    if (!isSubjectMenuOpen) return;

    const handlePointerDown = (event) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
        setIsSubjectMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSubjectMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubjectMenuOpen]);

  // Auto-advance top hero slider
  useEffect(() => {
    if (isSliderPaused) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [isSliderPaused]);

  const isSubjectOverviewMode =
    selectedLevel === 'all' &&
    selectedGrade === 'all' &&
    selectedSubject === 'all' &&
    !showAllBooksFlat;

  // Auto-shuffle Quick Picks ('ជួបចៃដន្យ') every 2 minutes when idle on overview
  const hasActiveDownloads = Object.keys(downloadingMap).length > 0;
  useEffect(() => {
    if (!isSubjectOverviewMode || books.length <= 4 || activeBook || hasActiveDownloads) {
      return;
    }
    const timer = window.setTimeout(() => {
      setRandomSeed((s) => s + 1);
    }, 120000);
    return () => window.clearTimeout(timer);
  }, [isSubjectOverviewMode, books.length, activeBook, hasActiveDownloads, randomSeed]);

  const quickPickBooks = useMemo(() => {
    if (books.length === 0) return [];
    const withCovers = books.filter(
      (b) => localCovers[b.r2_key] || (b.cover_url && !coverErrors[b.r2_key])
    );
    const pool = withCovers.length >= 4 ? [...withCovers] : [...books];
    // Deterministic Fisher-Yates shuffle based on randomSeed
    let s = randomSeed * 9301 + 49297;
    for (let i = pool.length - 1; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 4);
  }, [books, localCovers, coverErrors, randomSeed]);

  const subjectGroups = useMemo(() => {
    const grouped = new Map();
    grouped.set('general_knowledge', {
      subject: 'general_knowledge',
      label: isKm ? 'ចំណេះដឹងទូទៅ' : 'General Knowledge',
      books: [],
    });

    for (const book of books) {
      const subKey = book.subject || 'general';
      if (!grouped.has(subKey)) {
        grouped.set(subKey, {
          subject: subKey,
          label: book.subject_label || subKey,
          books: [],
        });
      }
      grouped.get(subKey).books.push(book);
    }

    const result = Array.from(grouped.values()).map((group) => {
      const sortedBooks = [...group.books].sort((a, b) => Number(a.grade) - Number(b.grade));
      const grades = sortedBooks.map((b) => Number(b.grade)).filter((g) => Number.isFinite(g) && g > 0);
      const minGrade = grades.length ? Math.min(...grades) : 4;
      const maxGrade = grades.length ? Math.max(...grades) : 12;
      const leadBook =
        sortedBooks.find((b) => localCovers[b.r2_key] || (b.cover_url && !coverErrors[b.r2_key])) ||
        sortedBooks[0];

      return {
        ...group,
        books: sortedBooks,
        count: sortedBooks.length,
        minGrade,
        maxGrade,
        leadBook,
      };
    });

    result.sort((a, b) => {
      const idxA = SUBJECT_ORDER.indexOf(a.subject);
      const idxB = SUBJECT_ORDER.indexOf(b.subject);
      const rankA = idxA === -1 ? 999 : idxA;
      const rankB = idxB === -1 ? 999 : idxB;
      if (rankA !== rankB) return rankA - rankB;
      return a.label.localeCompare(b.label, 'km');
    });

    return result;
  }, [books, localCovers, coverErrors, isKm]);

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      if (selectedLevel === 'saved' && !bookmarkedKeys.includes(book.r2_key)) return false;
      if (
        (selectedLevel === 'primary' ||
          selectedLevel === 'lower_secondary' ||
          selectedLevel === 'upper_secondary' ||
          selectedLevel === 'general_knowledge') &&
        book.level !== selectedLevel
      ) {
        return false;
      }
      if (selectedGrade !== 'all' && Number(book.grade) !== Number(selectedGrade)) return false;
      if (selectedSubject !== 'all' && book.subject !== selectedSubject) return false;
      return true;
    });
  }, [books, bookmarkedKeys, selectedLevel, selectedGrade, selectedSubject]);

  // Hydrate locally cached cover images first (zero network)
  useEffect(() => {
    if (books.length === 0) return;
    let cancelled = false;

    const hydrateCachedCovers = async () => {
      const additions = {};
      for (const b of books) {
        if (!b?.r2_key || localCoversRef.current[b.r2_key]) continue;
        const cachedUrl = await getCachedCoverBlobUrl(b.r2_key);
        if (cancelled) {
          if (cachedUrl) URL.revokeObjectURL(cachedUrl);
          return;
        }
        if (cachedUrl) {
          additions[b.r2_key] = cachedUrl;
        }
      }
      if (!cancelled && Object.keys(additions).length > 0) {
        localCoversRef.current = { ...localCoversRef.current, ...additions };
        setLocalCovers((prev) => ({ ...prev, ...additions }));
      }
    };

    hydrateCachedCovers();
    return () => {
      cancelled = true;
    };
  }, [books]);

  // Progressively extract & cache Page-1 covers (prioritize Subject lead covers in overview mode)
  useEffect(() => {
    if (!isAuthenticated || books.length === 0) return;
    const isOfflineBrowser = typeof navigator !== 'undefined' && !navigator.onLine;

    const candidateSource = isSubjectOverviewMode
      ? [
          ...subjectGroups.map((g) => g.leadBook).filter(Boolean),
          ...books,
        ]
      : filteredBooks;

    const seen = new Set();
    const pending = [];
    for (const b of candidateSource) {
      if (!b?.r2_key || seen.has(b.r2_key)) continue;
      seen.add(b.r2_key);
      if (b.cover_url && !coverErrors[b.r2_key]) continue;
      if (localCoversRef.current[b.r2_key]) continue;
      if (attemptedCoverKeysRef.current.has(b.r2_key)) continue;
      if (isOfflineBrowser && !offlineMap.has(b.r2_key)) continue;
      pending.push(b);
    }

    if (pending.length === 0) return;
    let cancelled = false;
    let cursor = 0;

    const worker = async () => {
      while (!cancelled) {
        const idx = cursor++;
        if (idx >= pending.length) break;
        const book = pending[idx];
        attemptedCoverKeysRef.current.add(book.r2_key);

        setExtractingCoverKeys((prev) => ({ ...prev, [book.r2_key]: true }));
        try {
          const result = await extractAndStoreBookCover(book);
          if (!cancelled && result?.localUrl) {
            localCoversRef.current[book.r2_key] = result.localUrl;
            setLocalCovers((prev) => ({ ...prev, [book.r2_key]: result.localUrl }));
            if (result.coverUrl) {
              setBooks((prev) =>
                prev.map((item) =>
                  item.r2_key === book.r2_key ? { ...item, cover_url: result.coverUrl } : item
                )
              );
            }
          }
        } catch {
          // Keep clean fallback cover if extraction fails
        } finally {
          if (!cancelled) {
            setExtractingCoverKeys((prev) => {
              const next = { ...prev };
              delete next[book.r2_key];
              return next;
            });
          }
        }
      }
    };

    const concurrency = Math.min(2, pending.length);
    for (let i = 0; i < concurrency; i++) {
      worker();
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, books, filteredBooks, isSubjectOverviewMode, subjectGroups, offlineMap, coverErrors]);

  // Revoke generated object URLs on unmount
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
      await refreshOfflineAndBookmarks();
      return true;
    } catch (err) {
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
    if (!book?.r2_key) {
      setActiveBook(book);
      return;
    }

    // Already saved offline -> open immediately
    if (offlineMap.has(book.r2_key)) {
      pendingOpenKeyRef.current = null;
      setActiveBook(book);
      return;
    }

    // Device is offline and book is not cached yet
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setActionError(
        isKm
          ? `គ្មានអ៊ីនធឺណិតទេ — សៀវភៅ «${book.title}» មិនទាន់បានទាញយកនៅឡើយទេ។`
          : `You are offline — "${book.title}" has not been downloaded yet.`
      );
      return;
    }

    pendingOpenKeyRef.current = book.r2_key;

    // Avoid starting a duplicate download if already in progress
    if (typeof downloadingMap[book.r2_key] === 'number') {
      return;
    }

    const saved = await handleSaveOffline(book);
    if (saved && pendingOpenKeyRef.current === book.r2_key) {
      pendingOpenKeyRef.current = null;
      setActiveBook(book);
    }
  };

  const handleRemoveOffline = async (book) => {
    await removeBookOffline(book.r2_key);
  };

  const handleToggleBookmark = (book) => {
    const next = toggleBookBookmark(currentUser, book.r2_key);
    setBookmarkedKeys(next);
  };

  const handleSelectLevel = (levelId) => {
    setSelectedLevel(levelId);
    setSelectedGrade('all');
    setSelectedSubject('all');
    setShowAllBooksFlat(false);
    setIsSubjectMenuOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div id="library-page" className="space-y-6 font-kh-body">
        <div className="pb-4 border-b border-white/10">
          <h1 className="font-kh-title text-2xl text-white tracking-wide">
            {isKm ? 'បណ្ណាល័យសៀវភៅសិក្សា' : 'Digital Library'}
          </h1>
          <p className="text-xs sm:text-sm text-white/75 mt-1">
            {isKm ? 'សៀវភៅសិក្សាគោលថ្នាក់ទី ៤ ដល់ទី ១២' : 'Textbooks for Grades 4 to 12'}
          </p>
        </div>
        <AuthRequiredBanner featureName={isKm ? 'បណ្ណាល័យ' : 'Digital Library'} />
      </div>
    );
  }

  return (
    <div id="library-page" className="space-y-4 sm:space-y-5 font-kh-body pb-12">
      {/* Auto-Sliding Library Banner */}
      <div
        className="relative w-full h-44 sm:h-56 md:h-64 rounded-2xl overflow-hidden bg-white/[0.05] shadow-md select-none group"
        onMouseEnter={() => setIsSliderPaused(true)}
        onMouseLeave={() => setIsSliderPaused(false)}
        onTouchStart={(e) => {
          setIsSliderPaused(true);
          touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const startX = touchStartXRef.current;
          const endX = e.changedTouches?.[0]?.clientX ?? null;
          if (startX !== null && endX !== null) {
            const diff = startX - endX;
            if (Math.abs(diff) > 40) {
              setActiveSlide((prev) =>
                diff > 0
                  ? (prev + 1) % HERO_SLIDES.length
                  : (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length
              );
            }
          }
          touchStartXRef.current = null;
          setIsSliderPaused(false);
        }}
      >
        <div
          className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          {HERO_SLIDES.map((slide) => (
            <div key={slide.id} className="relative w-full h-full shrink-0">
              <img
                src={slide.image}
                alt={isKm ? slide.titleKm : slide.titleEn}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#194350]/85 via-[#194350]/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex items-end justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <h2 className="font-kh-title text-base sm:text-xl md:text-2xl text-white leading-snug">
                    {isKm ? slide.titleKm : slide.titleEn}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200/95 line-clamp-1 sm:line-clamp-2">
                    {isKm ? slide.subtitleKm : slide.subtitleEn}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Offline status indicator when offline */}
        {!isOnline && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/75 text-amber-300 text-xs font-medium backdrop-blur-xs">
            <WifiOff className="w-3.5 h-3.5" />
            <span>{isKm ? 'គ្មានអ៊ីនធឺណិត' : 'Offline'}</span>
          </div>
        )}

        {/* Prev / Next Desktop Arrows */}
        <button
          type="button"
          onClick={() =>
            setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
          }
          aria-label={isKm ? 'ស្លាយមុន' : 'Previous slide'}
          className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-[#194350]/75 hover:bg-[#194350] text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
          aria-label={isKm ? 'ស្លាយបន្ទាប់' : 'Next slide'}
          className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-[#194350]/75 hover:bg-[#194350] text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Bottom Slide Dots */}
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
          {HERO_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveSlide(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                activeSlide === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Level Filter Segmented Control */}
      <div className="flex flex-col gap-2.5">
        <LayoutGroup id="library-levels">
          <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-xl overflow-x-auto select-none">
            {[
              ...LIBRARY_LEVELS,
              { id: 'saved', labelKm: `ចំណាំ (${toKhmerNumber(bookmarkedKeys.length)})`, labelEn: `Saved (${bookmarkedKeys.length})` },
            ].map((lvl) => {
              const isActive = selectedLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => handleSelectLevel(lvl.id)}
                  className={`relative min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-medium transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-[#38BDF8] font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="library-level-pill"
                      transition={{
                        type: 'spring',
                        stiffness: 340,
                        damping: 30,
                        mass: 0.75,
                      }}
                      className="absolute inset-0 rounded-lg bg-[#38BDF8]/18 shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{isKm ? lvl.labelKm : lvl.labelEn}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        {/* Grade & Subject Filter Row */}
        {books.length > 0 && (availableGrades.length > 0 || availableSubjects.length > 1) && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {availableGrades.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 w-full sm:flex-1 sm:min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedGrade('all');
                  setSelectedSubject('all');
                  setShowAllBooksFlat(false);
                  setIsSubjectMenuOpen(false);
                }}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedGrade === 'all'
                    ? 'bg-[#38BDF8] text-[#092731] font-semibold'
                    : 'bg-white/[0.07] text-white/85 hover:bg-white/15 hover:text-white'
                }`}
              >
                {isKm ? 'គ្រប់ថ្នាក់' : 'All Grades'}
              </button>
              {availableGrades.map((g) => {
                const isActive = Number(selectedGrade) === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setSelectedGrade(isActive ? 'all' : g);
                      setSelectedSubject('all');
                      setShowAllBooksFlat(false);
                      setIsSubjectMenuOpen(false);
                    }}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                      isActive
                        ? 'bg-[#38BDF8] text-[#092731] font-semibold'
                        : 'bg-white/[0.07] text-white/85 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {formatGradeLabel(g, isKm)}
                  </button>
                );
              })}
              </div>
            )}

            {availableSubjects.length > 1 && (
              <div ref={subjectDropdownRef} className="relative w-full sm:w-56 md:w-60 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSubjectMenuOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isSubjectMenuOpen}
                  aria-label={isKm ? 'ជ្រើសមុខវិជ្ជា' : 'Filter by subject'}
                  className={`w-full min-h-[38px] px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                    selectedSubject !== 'all'
                      ? 'bg-white/18 text-white font-semibold'
                      : isSubjectMenuOpen
                      ? 'bg-white/15 text-white font-semibold'
                      : 'bg-white/[0.07] hover:bg-white/12 text-white font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <SlidersHorizontal
                      className={`w-3.5 h-3.5 shrink-0 ${
                        selectedSubject !== 'all' ? 'text-[#38BDF8]' : 'text-white/75'
                      }`}
                    />
                    <span className="truncate">
                      {selectedSubject === 'all'
                        ? isKm
                          ? 'គ្រប់មុខវិជ្ជា'
                          : 'All Subjects'
                        : availableSubjects.find((s) => s.id === selectedSubject)?.label ||
                          (isKm ? 'គ្រប់មុខវិជ្ជា' : 'All Subjects')}
                    </span>
                  </span>

                  <span className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[11px] tabular-nums ${
                        selectedSubject !== 'all' ? 'text-white/90' : 'text-white/70'
                      }`}
                    >
                      {(() => {
                        const countVal =
                          selectedSubject === 'all'
                            ? subjectFilterTotal
                            : availableSubjects.find((s) => s.id === selectedSubject)?.count ?? 0;
                        return isKm ? toKhmerNumber(countVal) : countVal;
                      })()}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-150 ${
                        isSubjectMenuOpen
                          ? 'rotate-180 text-white'
                          : selectedSubject !== 'all'
                          ? 'text-white'
                          : 'text-white/75'
                      }`}
                    />
                  </span>
                </button>

                {isSubjectMenuOpen && (
                  <div
                    role="listbox"
                    aria-label={isKm ? 'បញ្ជីមុខវិជ្ជា' : 'Subjects list'}
                    className="absolute left-0 right-0 sm:left-auto sm:w-64 z-30 mt-1.5 bg-[#1d4d5c] border border-white/15 text-white rounded-xl shadow-2xl p-1.5"
                  >
                    <div className="max-h-72 overflow-y-auto space-y-0.5">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedSubject === 'all'}
                        onClick={() => {
                          setSelectedSubject('all');
                          setShowAllBooksFlat(false);
                          setIsSubjectMenuOpen(false);
                        }}
                        className={`w-full min-h-[38px] px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-left text-xs transition-colors cursor-pointer ${
                          selectedSubject === 'all'
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-white/85 hover:text-white hover:bg-white/10 font-medium'
                        }`}
                      >
                        <span className="truncate">{isKm ? 'គ្រប់មុខវិជ្ជា' : 'All Subjects'}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[11px] tabular-nums ${
                              selectedSubject === 'all' ? 'text-white' : 'text-white/65'
                            }`}
                          >
                            {isKm ? toKhmerNumber(subjectFilterTotal) : subjectFilterTotal}
                          </span>
                          {selectedSubject === 'all' && <Check className="w-3.5 h-3.5 text-[#38BDF8]" />}
                        </span>
                      </button>

                      <div className="my-1 border-t border-white/10" />

                      {availableSubjects.map((sub) => {
                        const isSelected = selectedSubject === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSelectedSubject(sub.id);
                              setShowAllBooksFlat(false);
                              setIsSubjectMenuOpen(false);
                            }}
                            className={`w-full min-h-[38px] px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-white/15 text-white font-semibold'
                                : 'text-white/85 hover:text-white hover:bg-white/10 font-medium'
                            }`}
                          >
                            <span className="truncate">{sub.label}</span>
                            <span className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[11px] tabular-nums ${
                                  isSelected ? 'text-white' : 'text-white/65'
                                }`}
                              >
                                {isKm ? toKhmerNumber(sub.count) : sub.count}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#38BDF8]" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline Feedback Banners */}
      {(error || actionError) && (
        <div className="bg-rose-500/15 border border-rose-400/55 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm text-rose-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError || error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setActionError(null);
            }}
            className="text-xs font-semibold underline shrink-0 cursor-pointer"
          >
            {isKm ? 'បិទ' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-2">
            <DotsLoader
              size="md"
              color="accent"
              label={isKm ? 'កំពុងផ្ទុកសៀវភៅ...' : 'Loading textbooks...'}
              className="text-xs text-white/75"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white/[0.05] rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[3/4] bg-white/[0.06]" />
                <div className="p-4 space-y-2.5">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !isConfigured && books.length === 0 ? (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-10 sm:p-14 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-white/[0.08] text-white flex items-center justify-center mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-kh-title text-lg text-white">
              {isKm ? 'កំពុងរៀបចំទិន្នន័យសៀវភៅពី R2' : 'Library Storage Pending Setup'}
            </h3>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
              {isKm
                ? 'សៀវភៅនឹងបង្ហាញនៅទីនេះដោយស្វ័យប្រវត្តិ នៅពេលការផ្ទុក Cloudflare R2 ត្រូវបានភ្ជាប់រួចរាល់។'
                : 'Books will appear here automatically once Cloudflare R2 storage is connected on the server.'}
            </p>
          </div>
          {isAdmin && (
            <div className="pt-1">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#38BDF8] text-[#092731] text-xs font-bold rounded-lg hover:bg-[#56CAF9] transition-colors"
              >
                {isKm ? 'ទៅកាន់ផ្ទាំងគ្រប់គ្រងបណ្ណាល័យ' : 'Open Admin Library Manager'}
              </Link>
            </div>
          )}
        </div>
      ) : isSubjectOverviewMode ? (
        <div className="space-y-6">
          {/* Quick Picks / ជួបចៃដន្យ (Compact 2-Col Horizontal Book Rows) */}
          {quickPickBooks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-kh-title text-base sm:text-lg text-white">
                  {isKm ? 'ជួបចៃដន្យ' : 'Quick Picks'}
                </h3>
                <button
                  type="button"
                  onClick={() => setRandomSeed((s) => s + 1)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.07] hover:bg-white/15 text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ប្ដូរថ្មី' : 'Shuffle'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                {quickPickBooks.map((book) => {
                  const theme = getSubjectTheme(book.subject);
                  const coverSrc =
                    localCovers[book.r2_key] ||
                    (!coverErrors[book.r2_key] ? book.cover_url || '' : '');
                  const isSavedOffline = offlineMap.has(book.r2_key);
                  const progress = downloadingMap[book.r2_key];
                  const isDownloading = typeof progress === 'number';

                  return (
                    <button
                      key={`quick-${book.r2_key}`}
                      type="button"
                      onClick={() => handleOpenBook(book)}
                      className="flex items-center gap-3.5 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] transition-colors text-left cursor-pointer group"
                    >
                      <div className="relative w-14 h-[74px] sm:w-16 sm:h-[86px] rounded-lg overflow-hidden shrink-0 bg-white/[0.08] shadow-sm">
                        {coverSrc ? (
                          <img
                            src={coverSrc}
                            alt={book.title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setCoverErrors((prev) => ({ ...prev, [book.r2_key]: true }))
                            }
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center font-kh-title text-sm sm:text-base tabular-nums bg-transparent text-white px-1 text-center"
                          >
                            {formatGradeBadgeNumber(book.grade, isKm)}
                          </div>
                        )}

                        {isDownloading && (
                          <div className="absolute inset-0 bg-[#194350]/85 backdrop-blur-[1px] flex flex-col items-center justify-center text-white">
                            <span className="text-[11px] font-semibold tabular-nums">
                              {isKm ? `${toKhmerNumber(progress)}%` : `${progress}%`}
                            </span>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                              <div
                                className="h-full bg-[#38BDF8] transition-all duration-150"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-kh-title text-sm sm:text-[15px] text-white leading-snug line-clamp-2 group-hover:underline transition-colors">
                          {book.title}
                        </p>
                        {isDownloading ? (
                          <p className="text-xs font-medium text-[#38BDF8] tabular-nums truncate">
                            {isKm
                              ? `កំពុងទាញយក ${toKhmerNumber(progress)}%...`
                              : `Downloading ${progress}%...`}
                          </p>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-white/75 tabular-nums truncate">
                            <span>{formatGradeLabel(book.grade, isKm)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatFileSize(book.file_size)}</span>
                          </div>
                        )}
                      </div>

                      {isSavedOffline && !isDownloading ? (
                        <span
                          className="w-6 h-6 text-emerald-300 inline-flex items-center justify-center shrink-0"
                          title={isKm ? 'បានទាញយក' : 'Downloaded'}
                        >
                          <Check className="w-4 h-4" />
                        </span>
                      ) : !isOnline && !isDownloading ? (
                        <span
                          className="w-6 h-6 text-white/40 inline-flex items-center justify-center shrink-0"
                          title={isKm ? 'ត្រូវការអ៊ីនធឺណិតដើម្បីទាញយក' : 'Internet required to download'}
                        >
                          <WifiOff className="w-3.5 h-3.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Subject Albums Grid / អាល់ប៊ុមសៀវភៅ (Stacked Album Aesthetic) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-kh-title text-base sm:text-lg text-white">
                {isKm ? 'អាល់ប៊ុមសៀវភៅ' : 'Subject Albums'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAllBooksFlat(true)}
                className="text-xs sm:text-sm font-medium text-white/80 hover:text-white underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap"
              >
                {isKm
                  ? `សៀវភៅទាំងអស់ (${toKhmerNumber(books.length)})`
                  : `All Books (${books.length})`}
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
              {subjectGroups.map((group) => {
                const lead = group.leadBook;
                const theme = getSubjectTheme(group.subject);
                const coverSrc = lead
                  ? localCovers[lead.r2_key] ||
                    (!coverErrors[lead.r2_key] ? lead.cover_url || '' : '')
                  : '';
                const isExtractingLead = lead ? Boolean(extractingCoverKeys[lead.r2_key]) : false;
                const isGeneralKnowledgeAlbum = group.subject === 'general_knowledge';
                const gradeRangeText = isGeneralKnowledgeAlbum
                  ? isKm
                    ? 'សៀវភៅផ្សេងៗ'
                    : 'Other Books'
                  : group.minGrade === group.maxGrade
                  ? formatGradeLabel(group.minGrade, isKm)
                  : isKm
                  ? `ទី ${toKhmerNumber(group.minGrade)}–${toKhmerNumber(group.maxGrade)}`
                  : `Gr. ${group.minGrade}–${group.maxGrade}`;

                return (
                  <button
                    key={group.subject}
                    type="button"
                    onClick={() => setSelectedSubject(group.subject)}
                    className="flex flex-col items-center text-center cursor-pointer group focus:outline-none"
                  >
                    {/* Stacked Album Cover Stack (Clean borderless layers) */}
                    <div className="w-full flex flex-col items-center">
                      <div className="w-[78%] h-1 rounded-t-sm bg-white/10 transition-transform duration-200 group-hover:-translate-y-0.5" />
                      <div className="w-[89%] h-1.5 rounded-t-sm bg-white/15 transition-transform duration-200 group-hover:-translate-y-0.5" />
                      <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-white/[0.08] shadow-md relative">
                        {coverSrc ? (
                          <img
                            src={coverSrc}
                            alt={group.label}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() => {
                              if (lead?.r2_key) {
                                setCoverErrors((prev) => ({ ...prev, [lead.r2_key]: true }));
                              }
                            }}
                            className="w-full h-full object-cover object-top transition-transform duration-200 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div
                            className="w-full h-full p-2.5 sm:p-3 flex flex-col justify-between text-left bg-transparent"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-[10px] sm:text-xs font-medium text-white/75 truncate">
                                {gradeRangeText}
                              </span>
                              <span
                                className="font-kh-title text-sm sm:text-base leading-none tabular-nums shrink-0"
                                style={{ color: theme.accent }}
                              >
                                {isKm ? toKhmerNumber(group.count) : group.count}
                              </span>
                            </div>

                            <div className="my-auto flex flex-col items-center justify-center text-center gap-1.5">
                              <div
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.08] flex items-center justify-center"
                                style={{ color: theme.accent }}
                              >
                                {isExtractingLead ? (
                                  <DotsLoader size="xs" color="accent" />
                                ) : isGeneralKnowledgeAlbum ? (
                                  <Globe2 className="w-5 h-5" />
                                ) : (
                                  <BookOpen className="w-4 h-4" />
                                )}
                              </div>
                            </div>

                            <div className="text-[10px] text-white/70 text-center tabular-nums truncate">
                              {isKm ? `${toKhmerNumber(group.count)} ក្បាល` : `${group.count} books`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clean Caption Directly Below Cover */}
                    <h4 className="mt-2 font-kh-title text-xs sm:text-sm text-white leading-snug line-clamp-1 group-hover:underline transition-colors w-full">
                      {group.label}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-white/70 tabular-nums truncate w-full">
                      {isKm
                        ? `${toKhmerNumber(group.count)} ក្បាល · ${gradeRangeText}`
                        : `${group.count} · ${gradeRangeText}`}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-10 sm:p-14 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white/[0.08] text-white flex items-center justify-center mx-auto">
            {selectedSubject === 'general_knowledge' || selectedLevel === 'general_knowledge' ? (
              <Globe2 className="w-6 h-6 text-[#38BDF8]" />
            ) : (
              <BookOpen className="w-6 h-6" />
            )}
          </div>
          <p className="text-sm font-medium text-white">
            {selectedLevel === 'saved'
              ? isKm
                ? 'មិនទាន់មានសៀវភៅដែលបានចំណាំទេ'
                : 'No bookmarked books yet'
              : selectedSubject === 'general_knowledge' || selectedLevel === 'general_knowledge'
              ? isKm
                ? 'មិនទាន់មានសៀវភៅចំណេះដឹងទូទៅនៅឡើយទេ'
                : 'No general knowledge books uploaded yet'
              : isKm
              ? 'រកមិនឃើញសៀវភៅតាមលក្ខខណ្ឌនេះទេ'
              : 'No books match your filters'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {isAdmin && (selectedSubject === 'general_knowledge' || selectedLevel === 'general_knowledge') && (
              <Link
                to="/admin"
                className="px-4 py-2 text-xs font-bold text-[#092731] bg-[#38BDF8] hover:bg-[#56CAF9] rounded-lg transition-colors"
              >
                {isKm ? 'Upload សៀវភៅចូលអាល់ប៊ុមនេះ' : 'Upload Books Here'}
              </Link>
            )}
            {(selectedLevel !== 'all' || selectedGrade !== 'all' || selectedSubject !== 'all' || showAllBooksFlat) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLevel('all');
                  setSelectedGrade('all');
                  setSelectedSubject('all');
                  setShowAllBooksFlat(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-white/12 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                {isKm ? 'ត្រឡប់ទៅអាល់ប៊ុមមុខវិជ្ជា' : 'Back to Subject Albums'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedLevel === 'all' && selectedGrade === 'all' && (selectedSubject !== 'all' || showAllBooksFlat) && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject('all');
                  setShowAllBooksFlat(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isKm ? 'ត្រឡប់ទៅអាល់ប៊ុមសៀវភៅ' : 'Back to albums'}</span>
              </button>
              <span className="text-xs text-white/75 tabular-nums">
                {selectedSubject !== 'all'
                  ? availableSubjects.find((s) => s.id === selectedSubject)?.label || ''
                  : isKm
                  ? 'សៀវភៅទាំងអស់'
                  : 'All Books'}{' '}
                ·{' '}
                {isKm
                  ? `${toKhmerNumber(filteredBooks.length)} ក្បាល`
                  : `${filteredBooks.length} books`}
              </span>
            </div>
          )}

          {/* Clean Bookshelf Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
            {filteredBooks.map((book) => {
              const theme = getSubjectTheme(book.subject);
              const isSavedOffline = offlineMap.has(book.r2_key);
              const isBookmarked = bookmarkedKeys.includes(book.r2_key);
              const progress = downloadingMap[book.r2_key];
              const isDownloading = typeof progress === 'number';
              const isExtractingCover = Boolean(extractingCoverKeys[book.r2_key]);
              const coverSrc =
                localCovers[book.r2_key] ||
                (!coverErrors[book.r2_key] ? book.cover_url || '' : '');
              const ringRadius = 18;
              const ringCircumference = 2 * Math.PI * ringRadius;
              const ringOffset =
                ringCircumference - ((isDownloading ? progress : 0) / 100) * ringCircumference;

              return (
                <article key={book.r2_key} className="flex flex-col">
                  {/* Book Cover (Click to auto-download, save offline, and open immediately) */}
                  <button
                    type="button"
                    onClick={() => handleOpenBook(book)}
                    className="w-full aspect-[3/4] rounded-lg overflow-hidden relative bg-white/[0.08] shadow-md cursor-pointer group text-left transition-transform hover:-translate-y-0.5"
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
                      <div
                        className="w-full h-full p-2.5 sm:p-3 flex flex-col justify-between bg-transparent"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[10px] sm:text-xs font-medium text-white/75 truncate">
                            {book.subject_label}
                          </span>
                          <span
                            className="font-kh-title text-sm sm:text-base leading-none tabular-nums shrink-0"
                            style={{ color: theme.accent }}
                          >
                            {formatGradeBadgeNumber(book.grade, isKm)}
                          </span>
                        </div>

                        <div className="my-auto flex flex-col items-center justify-center text-center gap-1.5">
                          <div
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/[0.08] flex items-center justify-center"
                            style={{ color: theme.accent }}
                          >
                            {isExtractingCover ? (
                              <DotsLoader size="xs" color="accent" />
                            ) : (
                              <BookOpen className="w-4 h-4" />
                            )}
                          </div>
                          <p className="font-kh-title text-[11px] sm:text-xs text-white leading-snug line-clamp-2">
                            {book.title}
                          </p>
                        </div>

                        <div className="text-[10px] text-white/70 text-center tabular-nums truncate">
                          {formatGradeLabel(book.grade, isKm)}
                        </div>
                      </div>
                    )}

                    {/* Download Progress Overlay directly on the book */}
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
                              stroke="#FFFFFF"
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
                        <span className="mt-1.5 text-[11px] font-medium text-white/95 text-center leading-tight">
                          {isKm ? 'កំពុងទាញយក...' : 'Downloading...'}
                        </span>
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                          <div
                            className="h-full bg-[#38BDF8] transition-all duration-150"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Title, Zero-Pill Metadata & Subtle Bookmark */}
                  <div className="pt-2 space-y-0.5 min-w-0">
                    <h3
                      onClick={() => handleOpenBook(book)}
                      className="font-kh-title text-xs sm:text-sm text-white leading-snug line-clamp-1 hover:underline transition-colors cursor-pointer"
                    >
                      {book.title}
                    </h3>

                    <div className="flex items-center justify-between gap-1">
                      <div className="text-[10px] sm:text-xs tabular-nums truncate">
                        {isDownloading ? (
                          <span className="text-[#38BDF8] font-medium">
                            {isKm
                              ? `កំពុងទាញយក ${toKhmerNumber(progress)}%`
                              : `Downloading ${progress}%`}
                          </span>
                        ) : (
                          <span className="text-white/75">
                            {formatGradeLabel(book.grade, isKm)} · {formatFileSize(book.file_size)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {isSavedOffline && !isDownloading ? (
                          <span
                            title={isKm ? 'បានទាញយក' : 'Downloaded'}
                            className="w-5 h-5 inline-flex items-center justify-center text-emerald-300"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : !isOnline && !isDownloading ? (
                          <span
                            title={isKm ? 'ត្រូវការអ៊ីនធឺណិតដើម្បីទាញយក' : 'Internet required to download'}
                            className="w-5 h-5 inline-flex items-center justify-center text-white/40"
                          >
                            <WifiOff className="w-3 h-3" />
                          </span>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(book)}
                          aria-label={isKm ? 'ចំណាំសៀវភៅ' : 'Bookmark book'}
                          title={isKm ? 'ចំណាំ' : 'Bookmark'}
                          className={`w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${
                            isBookmarked
                              ? 'text-[#38BDF8]'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
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
