import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  BookOpen,
  Image as ImageIcon,
  History,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import Modal from './Modal';
import DotsLoader from './DotsLoader';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { formatFileSize, toKhmerNumber } from '../../data/librarySubjects';
import {
  getDeviceStorageSummary,
  clearAllDownloadedBooks,
  clearCachedBookCoversAndCatalog,
} from '../../utils/offlineLibrary';
import {
  getStudyHistory,
  hydrateStudyHistoryFromOfflineDB,
  clearStudyHistory,
} from '../../utils/studyHistory';

export default function ClearStorageModal({ isOpen, onClose }) {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const isKm = language === 'km';

  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [summary, setSummary] = useState({
    downloadedBooksCount: 0,
    downloadedBooksBytes: 0,
    tempCacheCount: 0,
    tempCacheBytes: 0,
    totalAppManagedBytes: 0,
    studyHistoryCount: 0,
  });

  const refreshSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storage, historyList] = await Promise.all([
        getDeviceStorageSummary(),
        hydrateStudyHistoryFromOfflineDB(currentUser).catch(() => getStudyHistory(currentUser)),
      ]);
      setSummary({
        ...storage,
        studyHistoryCount: Array.isArray(historyList) ? historyList.length : 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      setFeedback('');
      setConfirmClearAll(false);
      refreshSummary();
    }
  }, [isOpen, refreshSummary]);

  const handleClearBooks = async () => {
    if (busyAction || summary.downloadedBooksCount === 0) return;
    setBusyAction('books');
    setFeedback('');
    try {
      await clearAllDownloadedBooks();
      await refreshSummary();
      setFeedback(
        isKm
          ? 'បានលុបសៀវភៅដែលបានទាញយកទាំងអស់ចេញពីឧបករណ៍រួចរាល់។'
          : 'Removed all downloaded books from this device.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleClearTempCache = async () => {
    if (busyAction || summary.tempCacheCount === 0) return;
    setBusyAction('temp');
    setFeedback('');
    try {
      await clearCachedBookCoversAndCatalog();
      await refreshSummary();
      setFeedback(
        isKm
          ? 'បានសម្អាតរូបក្រប និងទិន្នន័យបណ្ដោះអាសន្នរួចរាល់។'
          : 'Cleared temporary cover and catalog cache.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleClearHistory = async () => {
    if (busyAction || summary.studyHistoryCount === 0) return;
    setBusyAction('history');
    setFeedback('');
    try {
      clearStudyHistory(currentUser);
      await refreshSummary();
      setFeedback(
        isKm ? 'បានសម្អាតប្រវត្តិសិក្សាលើឧបករណ៍រួចរាល់។' : 'Cleared study history on this device.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleClearAll = async () => {
    if (busyAction) return;
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }

    setBusyAction('all');
    setConfirmClearAll(false);
    setFeedback('');
    try {
      await clearAllDownloadedBooks();
      await clearCachedBookCoversAndCatalog();
      clearStudyHistory(currentUser);
      await refreshSummary();
      setFeedback(
        isKm
          ? 'បានសម្អាតទិន្នន័យសំណល់ទាំងអស់ក្នុងឧបករណ៍ដោយជោគជ័យ។'
          : 'Cleared all cached device data successfully.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const hasAnyData =
    summary.downloadedBooksCount > 0 ||
    summary.tempCacheCount > 0 ||
    summary.studyHistoryCount > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={isKm ? 'សម្អាតទិន្នន័យក្នុងឧបករណ៍' : 'Clean Device Storage'}
      subtitle={
        isKm
          ? 'គ្រប់គ្រង និងលុបទិន្នន័យដែលនៅសេសសល់លើឧបករណ៍សិស្ស'
          : 'Manage and remove cached files stored on this device'
      }
    >
      <div className="space-y-4 font-kh-body">
        {/* Summary Card */}
        <div className="rounded-xl bg-white/[0.06] border border-white/10 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/70">
                {isKm ? 'ទំហំទិន្នន័យសរុបលើឧបករណ៍' : 'App Storage on Device'}
              </p>
              <p className="font-kh-title text-lg text-white tabular-nums">
                {isLoading ? '...' : formatFileSize(summary.totalAppManagedBytes)}
              </p>
            </div>
          </div>
          {summary.browserUsage > 0 && (
            <div className="text-right shrink-0">
              <p className="text-[11px] text-white/60">
                {isKm ? 'ទំហំកម្មវិធីសរុប' : 'Browser Quota Used'}
              </p>
              <p className="text-xs font-semibold text-white/85 tabular-nums">
                {formatFileSize(summary.browserUsage)}
              </p>
            </div>
          )}
        </div>

        {feedback && (
          <div className="rounded-xl px-3.5 py-2.5 bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
            <span>{feedback}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <DotsLoader
              size="md"
              color="accent"
              label={isKm ? 'កំពុងពិនិត្យទំហំ...' : 'Checking storage...'}
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* 1. Downloaded Books */}
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BookOpen className="w-5 h-5 text-[#38BDF8] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {isKm ? 'សៀវភៅបានទាញយក' : 'Downloaded Books'}
                  </p>
                  <p className="text-xs text-white/70 tabular-nums">
                    {isKm
                      ? `${toKhmerNumber(summary.downloadedBooksCount)} ក្បាល · ${formatFileSize(summary.downloadedBooksBytes)}`
                      : `${summary.downloadedBooksCount} books · ${formatFileSize(summary.downloadedBooksBytes)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearBooks}
                disabled={Boolean(busyAction) || summary.downloadedBooksCount === 0}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-rose-500/20 hover:text-rose-200 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 inline-flex items-center gap-1.5"
              >
                {busyAction === 'books' ? (
                  <DotsLoader size="xs" color="white" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isKm ? 'លុប' : 'Clear'}</span>
              </button>
            </div>

            {/* 2. Cached Covers & Catalog */}
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ImageIcon className="w-5 h-5 text-[#38BDF8] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {isKm ? 'រូបក្រប & ទិន្នន័យបណ្ដោះអាសន្ន' : 'Cached Covers & Temp Data'}
                  </p>
                  <p className="text-xs text-white/70 tabular-nums">
                    {isKm
                      ? `${toKhmerNumber(summary.tempCacheCount)} ឯកសារ · ${formatFileSize(summary.tempCacheBytes)}`
                      : `${summary.tempCacheCount} items · ${formatFileSize(summary.tempCacheBytes)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearTempCache}
                disabled={Boolean(busyAction) || summary.tempCacheCount === 0}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-rose-500/20 hover:text-rose-200 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 inline-flex items-center gap-1.5"
              >
                {busyAction === 'temp' ? (
                  <DotsLoader size="xs" color="white" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isKm ? 'សម្អាត' : 'Clear'}</span>
              </button>
            </div>

            {/* 3. Study History */}
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <History className="w-5 h-5 text-[#38BDF8] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {isKm ? 'ប្រវត្តិសិក្សាក្នុងឧបករណ៍' : 'Local Study History'}
                  </p>
                  <p className="text-xs text-white/70 tabular-nums">
                    {isKm
                      ? `${toKhmerNumber(summary.studyHistoryCount)} កំណត់ត្រា`
                      : `${summary.studyHistoryCount} items`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={Boolean(busyAction) || summary.studyHistoryCount === 0}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-rose-500/20 hover:text-rose-200 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 inline-flex items-center gap-1.5"
              >
                {busyAction === 'history' ? (
                  <DotsLoader size="xs" color="white" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isKm ? 'សម្អាត' : 'Clear'}</span>
              </button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-white/60 leading-relaxed">
          {isKm
            ? 'គណនីសិស្ស និងតែងសេចក្ដីដែលបានចំណាំរក្សាទុក នឹងនៅតែត្រូវបានរក្សាដោយសុវត្ថិភាព។'
            : 'Your student account and bookmarked saved essays remain safe.'}
        </p>

        {/* Clear All Action */}
        <div className="pt-1 flex items-center gap-2.5">
          {confirmClearAll ? (
            <>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={Boolean(busyAction)}
                className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {busyAction === 'all' ? (
                  <DotsLoader size="xs" color="white" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isKm ? 'បញ្ជាក់ការសម្អាតទាំងអស់' : 'Confirm Clear All'}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                {isKm ? 'បោះបង់' : 'Cancel'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isLoading || Boolean(busyAction) || !hasAnyData}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#38BDF8] hover:bg-[#56CAF9] disabled:opacity-45 disabled:cursor-not-allowed text-[#092731] font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isKm ? 'សម្អាតទិន្នន័យសេសសល់ទាំងអស់' : 'Clean All Leftover Data'}
              </span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
