import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import Button from '../components/common/Button';
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

export default function HomePage() {
  const { language } = useLanguage();
  const {
    currentUser,
    isAuthenticated,
    setIsRegisterOpen,
    setIsLoginOpen,
  } = useAuth();
  const isKm = language === 'km';
  const isOnline = useOnlineStatus();

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

  const fullName = useMemo(() => {
    if (!currentUser) return '';
    return isKm
      ? `${currentUser.last_name || ''} ${currentUser.first_name || ''}`.trim()
      : `${currentUser.first_name_en || currentUser.first_name || ''} ${
          currentUser.last_name_en || currentUser.last_name || ''
        }`.trim();
  }, [currentUser, isKm]);

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
        const fetchedBooks = Array.isArray(data.books) ? data.books : [];

        const byKey = new Map(fetchedBooks.map((b) => [b.r2_key, b]));
        for (const off of offlineList) {
          if (off?.r2_key && !byKey.has(off.r2_key)) {
            byKey.set(off.r2_key, off);
          }
        }
        if (!cancelled) {
          setBooks(Array.from(byKey.values()));
        }
      } catch {
        if (!cancelled) {
          setBooks(offlineList);
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

  const { featuredBooks, isGradeSpecificShelf } = useMemo(() => {
    if (books.length === 0) {
      return { featuredBooks: [], isGradeSpecificShelf: false };
    }

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

    const sorted = [...books].sort((a, b) => scoreBook(b) - scoreBook(a));
    return {
      featuredBooks: sorted.slice(0, 4),
      isGradeSpecificShelf: gradeMatches.length >= 2,
    };
  }, [books, studentGradeNumber, offlineMap, localCovers, coverErrors]);

  useEffect(() => {
    if (featuredBooks.length === 0) return;
    let cancelled = false;

    const hydrateCovers = async () => {
      const additions = {};
      for (const b of featuredBooks) {
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
  }, [featuredBooks]);

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
      {/* 1. Clean Open Greeting / Guest Header */}
      <header className="pb-5 border-b border-white/10">
        {isAuthenticated ? (
          <div className="space-y-1 min-w-0">
            <h1 className="font-kh-title text-2xl sm:text-[28px] text-white leading-relaxed pt-1">
              {isKm
                ? `សួស្តី ${fullName || currentUser?.student_id}`
                : `Welcome, ${fullName || currentUser?.student_id}`}
            </h1>
            <p className="text-xs sm:text-sm text-white/70 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                {studentGradeNumber
                  ? formatGradeLabel(studentGradeNumber, isKm)
                  : currentUser?.grade || (isKm ? 'ថ្នាក់ទី ១២' : 'Grade 12')}
              </span>
              {currentUser?.classroom && (
                <>
                  <span className="text-white/30">·</span>
                  <span>
                    {isKm ? `បន្ទប់ ${currentUser.classroom}` : `Class ${currentUser.classroom}`}
                  </span>
                </>
              )}
              {!isOnline && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="inline-flex items-center gap-1 text-[#38BDF8] font-medium">
                    <WifiOff className="w-3.5 h-3.5" />
                    {isKm ? 'Offline' : 'Offline'}
                  </span>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <h1 className="font-kh-title text-2xl sm:text-3xl text-white leading-relaxed pt-0.5">
                {isKm
                  ? 'ដោះស្រាយលំហាត់ តែងសេចក្ដី និងអានសៀវភៅសិក្សា'
                  : 'Solve Exercises, Write Essays, and Read Textbooks'}
              </h1>
              <p className="text-xs sm:text-sm text-white/70">
                {isKm
                  ? 'ថ្នាលសិក្សាសម្រាប់សិស្សថ្នាក់ទី ៤ ដល់ទី ១២។'
                  : 'Digital study workspace for Grades 4 to 12.'}
              </p>
            </div>

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
        )}
      </header>

      {/* 2. Concise 3-Tile Study Shortcuts */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.to}
              to={tool.to}
              className="group bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-2xl p-3.5 lg:p-4 flex items-center justify-between gap-2.5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-[#38BDF8]/12 text-[#38BDF8] flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 lg:w-5 lg:h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-kh-title text-sm lg:text-[15px] text-white leading-snug">
                    {tool.title}
                  </h2>
                  <p className="text-[11px] lg:text-xs text-white/65 truncate mt-0.5">{tool.desc}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-[#38BDF8] group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          );
        })}
      </section>

      {/* 3. Real Textbooks Strip (4 books max) */}
      {(isLoadingBooks || featuredBooks.length > 0) && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-kh-title text-lg text-white">
              {isGradeSpecificShelf && studentGradeNumber
                ? isKm
                  ? `សៀវភៅសម្រាប់${formatGradeLabel(studentGradeNumber, true)}`
                  : `Books for ${formatGradeLabel(studentGradeNumber, false)}`
                : isKm
                ? 'សៀវភៅសិក្សាគោល'
                : 'Core Textbooks'}
            </h2>
            <Link
              to="/library"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#38BDF8] hover:text-[#7DD3FC] transition-colors whitespace-nowrap shrink-0"
            >
              <span>{isKm ? 'មើលទាំងអស់' : 'View all'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>

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

          {isLoadingBooks ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="space-y-2 animate-pulse">
                  <div className="w-full aspect-[3/4] rounded-xl bg-white/[0.06] border border-white/10" />
                  <div className="h-3.5 w-3/4 rounded bg-white/[0.08]" />
                  <div className="h-3 w-1/2 rounded bg-white/[0.05]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {featuredBooks.map((book) => {
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
                        <div className="w-full h-full p-3 flex flex-col justify-between bg-transparent">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[11px] font-medium text-white/75 truncate">
                              {book.subject_label}
                            </span>
                            <span className="font-kh-title text-base leading-none tabular-nums text-white shrink-0">
                              {toKhmerNumber(book.grade)}
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

                    <div className="pt-2 space-y-0.5 min-w-0">
                      <h3
                        onClick={() => handleOpenBook(book)}
                        className="font-kh-title text-xs sm:text-sm text-white leading-snug line-clamp-1 hover:underline cursor-pointer"
                      >
                        {book.title}
                      </h3>
                      <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-white/65 tabular-nums">
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
          )}
        </section>
      )}

      {/* 4. Subtle Single-Line Saved Collection Links (Only when student has saved items) */}
      {isAuthenticated && (offlineCount > 0 || savedEssayCount > 0) && (
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/75">
          {offlineCount > 0 && (
            <Link
              to="/library"
              className="hover:text-[#38BDF8] transition-colors inline-flex items-center gap-1.5 tabular-nums"
            >
              <span>
                {isKm
                  ? `សៀវភៅអាន Offline · ${toKhmerNumber(offlineCount)} ក្បាល`
                  : `Offline books · ${offlineCount}`}
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
