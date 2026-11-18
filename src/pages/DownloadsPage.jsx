import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Trash2,
  Search,
  HardDrive,
  CheckCircle2,
  Eraser,
} from 'lucide-react';
import DotsLoader from '../components/common/DotsLoader';
import PdfReaderModal from '../components/library/PdfReaderModal';
import ClearStorageModal from '../components/common/ClearStorageModal';
import { useLanguage } from '../context/LanguageContext';
import {
  formatGradeLabel,
  formatGradeBadgeNumber,
  formatFileSize,
  getSubjectTheme,
  toKhmerNumber,
} from '../data/librarySubjects';
import {
  getOfflineBooksMetadata,
  removeBookOffline,
  clearAllDownloadedBooks,
  getCachedCoverBlobUrl,
} from '../utils/offlineLibrary';

export default function DownloadsPage() {
  const { language } = useLanguage();
  const isKm = language === 'km';

  const [downloadedBooks, setDownloadedBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [localCovers, setLocalCovers] = useState({});
  const [coverErrors, setCoverErrors] = useState({});
  const [activeBook, setActiveBook] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);

  const coverUrlsRef = React.useRef([]);

  const revokeCoverUrls = useCallback(() => {
    for (const url of coverUrlsRef.current) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore URL revoke error
      }
    }
    coverUrlsRef.current = [];
  }, []);

  const loadDownloadedBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getOfflineBooksMetadata();
      const sorted = [...list].sort((a, b) => {
        const tA = new Date(a.savedOfflineAt || 0).getTime();
        const tB = new Date(b.savedOfflineAt || 0).getTime();
        return tB - tA;
      });
      setDownloadedBooks(sorted);

      revokeCoverUrls();
      const covers = {};
      const nextUrls = [];
      for (const item of sorted) {
        if (!item?.r2_key) continue;
        const url = await getCachedCoverBlobUrl(item.r2_key);
        if (url) {
          covers[item.r2_key] = url;
          nextUrls.push(url);
        }
      }
      coverUrlsRef.current = nextUrls;
      setLocalCovers(covers);
    } finally {
      setIsLoading(false);
    }
  }, [revokeCoverUrls]);

  useEffect(() => {
    loadDownloadedBooks();
    const handleUpdate = () => loadDownloadedBooks();
    window.addEventListener('wsd:library-offline-updated', handleUpdate);
    window.addEventListener('wsd:device-cache-cleared', handleUpdate);
    return () => {
      window.removeEventListener('wsd:library-offline-updated', handleUpdate);
      window.removeEventListener('wsd:device-cache-cleared', handleUpdate);
      revokeCoverUrls();
    };
  }, [loadDownloadedBooks, revokeCoverUrls]);

  const totalBytes = useMemo(
    () => downloadedBooks.reduce((sum, b) => sum + Number(b?.file_size || 0), 0),
    [downloadedBooks]
  );

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return downloadedBooks;
    return downloadedBooks.filter((b) => {
      const hay = `${b.title || ''} ${b.subject_label || ''} ${formatGradeLabel(b.grade, isKm)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [downloadedBooks, searchQuery, isKm]);

  const handleDeleteOne = async (book) => {
    if (!book?.r2_key || deletingKey) return;
    setDeletingKey(book.r2_key);
    setFeedback('');
    try {
      await removeBookOffline(book.r2_key);
      if (activeBook?.r2_key === book.r2_key) {
        setActiveBook(null);
      }
      setFeedback(
        isKm
          ? `បានលុប «${book.title}» ចេញពីឧបករណ៍រួចរាល់។`
          : `Removed "${book.title}" from device.`
      );
    } finally {
      setDeletingKey(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    setIsClearingAll(true);
    setConfirmClearAll(false);
    setFeedback('');
    try {
      await clearAllDownloadedBooks();
      setActiveBook(null);
      setFeedback(
        isKm
          ? 'បានលុបសៀវភៅដែលបានទាញយកទាំងអស់ចេញពីឧបករណ៍រួចរាល់។'
          : 'Removed all downloaded books from device.'
      );
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div id="downloads-page" className="space-y-5 font-kh-body pb-10">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <Link
            to="/more"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-[#38BDF8] transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isKm ? 'ត្រឡប់ទៅ ច្រើនទៀត' : 'Back to More'}</span>
          </Link>
          <h1 className="font-kh-title text-2xl text-white">
            {isKm ? 'សៀវភៅបានទាញយក' : 'Downloaded Books'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/75 tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>
                {isKm
                  ? `${toKhmerNumber(downloadedBooks.length)} ក្បាល · ${formatFileSize(totalBytes)}`
                  : `${downloadedBooks.length} books · ${formatFileSize(totalBytes)}`}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsCleanupOpen(true)}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>{isKm ? 'សម្អាតទិន្នន័យ' : 'Clean Storage'}</span>
          </button>

          {downloadedBooks.length > 0 && (
            confirmClearAll ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={isClearingAll}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  {isClearingAll ? (
                    <DotsLoader size="xs" color="white" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isKm ? 'បញ្ជាក់លុបទាំងអស់' : 'Confirm Delete All'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="min-h-[38px] px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  {isKm ? 'បោះបង់' : 'Cancel'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/35 text-xs font-semibold text-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKm ? 'លុបទាំងអស់' : 'Delete All'}</span>
              </button>
            )
          )}
        </div>
      </header>

      {feedback && (
        <div className="rounded-xl px-4 py-2.5 bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search bar when more than 3 downloaded books */}
      {downloadedBooks.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isKm ? 'ស្វែងរកសៀវភៅបានទាញយក...' : 'Search downloaded books...'}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/25 focus:border-[#38BDF8]"
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <DotsLoader
            size="md"
            color="accent"
            label={isKm ? 'កំពុងផ្ទុកសៀវភៅ...' : 'Loading downloaded books...'}
          />
        </div>
      ) : downloadedBooks.length === 0 ? (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-10 sm:p-14 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-white/[0.08] text-[#38BDF8] flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-kh-title text-lg text-white">
              {isKm ? 'មិនទាន់មានសៀវភៅបានទាញយកទេ' : 'No Downloaded Books Yet'}
            </h3>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              {isKm
                ? 'សៀវភៅដែលអ្នកបានចុចបើកអាន ឬទាញយកពីបណ្ណាល័យ នឹងបង្ហាញនៅទីនេះដើម្បីងាយស្រួលអាន និងគ្រប់គ្រងទំហំ។'
                : 'Books you open or save from the Library will appear here for reading and storage management.'}
            </p>
          </div>
          <Link
            to="/library"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs sm:text-sm font-bold transition-colors"
          >
            {isKm ? 'ទៅកាន់បណ្ណាល័យសៀវភៅ' : 'Go to Library'}
          </Link>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-10 text-center text-sm text-white/75">
          {isKm ? 'រកមិនឃើញសៀវភៅដែលត្រូវនឹងការស្វែងរកទេ' : 'No matching downloaded books'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredBooks.map((book) => {
            const theme = getSubjectTheme(book.subject);
            const coverSrc =
              localCovers[book.r2_key] ||
              (!coverErrors[book.r2_key] ? book.cover_url || '' : '');
            const isDeleting = deletingKey === book.r2_key;

            return (
              <div
                key={book.r2_key}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setActiveBook(book)}
                  className="w-16 h-[86px] rounded-xl overflow-hidden shrink-0 bg-white/[0.08] shadow-sm cursor-pointer text-left"
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
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center">
                      <span
                        className="font-kh-title text-xs tabular-nums"
                        style={{ color: theme.accent }}
                      >
                        {formatGradeBadgeNumber(book.grade, isKm)}
                      </span>
                    </div>
                  )}
                </button>

                <div
                  onClick={() => setActiveBook(book)}
                  className="min-w-0 flex-1 space-y-1 cursor-pointer"
                >
                  <h3 className="font-kh-title text-sm sm:text-base text-white leading-snug line-clamp-2 hover:underline">
                    {book.title}
                  </h3>
                  <p className="text-xs text-white/70 truncate">
                    {book.subject_label} · {formatGradeLabel(book.grade, isKm)}
                  </p>
                  <p className="text-xs font-medium text-[#38BDF8] tabular-nums">
                    {formatFileSize(book.file_size)}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveBook(book)}
                    className="px-3 py-1.5 rounded-lg bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isKm ? 'អាន' : 'Read'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOne(book)}
                    disabled={isDeleting}
                    aria-label={isKm ? `លុប ${book.title}` : `Delete ${book.title}`}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-rose-500/20 text-white/80 hover:text-rose-200 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <DotsLoader size="xs" color="white" />
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isKm ? 'លុប' : 'Delete'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeBook && (
        <PdfReaderModal
          book={activeBook}
          isKm={isKm}
          isOfflineSaved={true}
          downloadProgress={null}
          onClose={() => setActiveBook(null)}
          onSaveOffline={() => Promise.resolve(true)}
          onRemoveOffline={(b) => handleDeleteOne(b)}
        />
      )}

      <ClearStorageModal
        isOpen={isCleanupOpen}
        onClose={() => setIsCleanupOpen(false)}
      />
    </div>
  );
}
