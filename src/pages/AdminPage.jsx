import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  Database,
  Lock,
  LogIn,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  Loader2,
  Library,
  Upload,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSavedEssays, hydrateSavedEssaysFromOfflineDB } from '../utils/savedEssays';
import { getGradeLabel } from '../data/essayPresets';
import { LIBRARY_GRADES, formatGradeLabel, formatFileSize } from '../data/librarySubjects';
import { useOnlineStatus } from '../hooks/usePWA';
import {
  extractAndStoreBookCover,
  extractCoverBlobFromFile,
  uploadBookCoverBlob,
} from '../utils/pdfClient';

function readAllLocalSavedEssays() {
  if (typeof window === 'undefined') return [];
  const all = [];
  const seenIds = new Set();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('wsd_saved_essays_')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (item?.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          all.push(item);
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return all.sort((a, b) => {
    const tA = new Date(a.updatedAt || a.savedAt || 0).getTime();
    const tB = new Date(b.updatedAt || b.savedAt || 0).getTime();
    return tB - tA;
  });
}

function getLocalStorageKb() {
  if (typeof window === 'undefined') return '0.0 KB';
  try {
    let totalChars = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      const v = localStorage.getItem(k) || '';
      totalChars += k.length + v.length;
    }
    const kb = (totalChars * 2) / 1024;
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(2)} MB`;
    }
    return `${kb.toFixed(1)} KB`;
  } catch {
    return '0.0 KB';
  }
}

export default function AdminPage() {
  const { t, language } = useLanguage();
  const { currentUser, isAuthenticated, isAdmin, setIsLoginOpen } = useAuth();
  const isKm = language === 'km';
  const isOnline = useOnlineStatus();

  const [activeAdminTab, setActiveAdminTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [savedEssays, setSavedEssays] = useState([]);
  const [storageSizeLabel, setStorageSizeLabel] = useState('0.0 KB');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataSourceLabel, setDataSourceLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Library R2 management state
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [libraryConfigured, setLibraryConfigured] = useState(false);
  const [libraryBucketName, setLibraryBucketName] = useState('wsd-library');
  const [libraryTotalBytes, setLibraryTotalBytes] = useState(0);
  const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);
  const [libraryFeedback, setLibraryFeedback] = useState(null);
  const [uploadGrade, setUploadGrade] = useState('12');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploadingBook, setIsUploadingBook] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [isGeneratingCovers, setIsGeneratingCovers] = useState(false);
  const [coverGenProgress, setCoverGenProgress] = useState({ done: 0, total: 0 });

  const loadRealData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      // 1. Load real student accounts from Supabase + local cache (excluding hardcoded demo placeholder)
      const byId = new Map();

      if (supabase && isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
        const { data, error } = await supabase
          .from('students')
          .select('id, student_id, first_name, last_name, first_name_en, last_name_en, grade, classroom, email, phone, role, created_at')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          for (const row of data) {
            const key = String(row.student_id || row.email || row.id).toLowerCase();
            byId.set(key, row);
          }
          setDataSourceLabel(isKm ? 'ទិន្នន័យផ្ទាល់ពី Database' : 'Live Database');
        } else {
          setDataSourceLabel(isKm ? 'ទិន្នន័យក្នុងម៉ាស៊ីន' : 'Local Records');
        }
      } else {
        setDataSourceLabel(isKm ? 'ទិន្នន័យក្នុងម៉ាស៊ីន' : 'Local Records');
      }

      // Merge locally registered accounts if not already in Supabase list
      try {
        const rawLocal = localStorage.getItem('wsd_local_students_db');
        const localStudents = rawLocal ? JSON.parse(rawLocal) : [];
        if (Array.isArray(localStudents)) {
          for (const row of localStudents) {
            const key = String(row.student_id || row.email || '').toLowerCase();
            if (key && !byId.has(key)) {
              byId.set(key, row);
            }
          }
        }
      } catch {
        // Ignore parse error
      }

      setStudents(Array.from(byId.values()));

      // 2. Hydrate real saved essays from IndexedDB + localStorage
      if (currentUser) {
        await hydrateSavedEssaysFromOfflineDB(currentUser);
      }
      const combinedEssays = readAllLocalSavedEssays();
      if (combinedEssays.length === 0 && currentUser) {
        setSavedEssays(getSavedEssays(currentUser));
      } else {
        setSavedEssays(combinedEssays);
      }

      setStorageSizeLabel(getLocalStorageKb());

      // 3. Load real library books & R2 status
      if (typeof navigator === 'undefined' || navigator.onLine) {
        try {
          const libRes = await fetch('/api/library/books');
          if (libRes.ok) {
            const libData = await libRes.json();
            setLibraryConfigured(Boolean(libData.configured));
            setLibraryBucketName(libData.bucketName || 'wsd-library');
            setLibraryBooks(Array.isArray(libData.books) ? libData.books : []);
            setLibraryTotalBytes(Number(libData.totalSizeBytes || 0));
          }
        } catch {
          // Ignore network error during admin fetch
        }
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, isKm]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadRealData();
    }
  }, [isAuthenticated, isAdmin, loadRealData]);

  useEffect(() => {
    const sync = () => {
      setSavedEssays(readAllLocalSavedEssays());
      setStorageSizeLabel(getLocalStorageKb());
    };
    window.addEventListener('wsd:saved-essays-updated', sync);
    return () => window.removeEventListener('wsd:saved-essays-updated', sync);
  }, []);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const fullName = `${s.last_name || ''} ${s.first_name || ''} ${s.first_name_en || ''} ${s.last_name_en || ''}`.toLowerCase();
      return (
        fullName.includes(q) ||
        String(s.student_id || '').toLowerCase().includes(q) ||
        String(s.email || '').toLowerCase().includes(q) ||
        String(s.grade || '').toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery]);

  const filteredEssays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return savedEssays;
    return savedEssays.filter((item) => {
      const topic = (item.essay?.detected_topic || '').toLowerCase();
      const note = (item.note || '').toLowerCase();
      const type = (item.essay?.essay_type_label || '').toLowerCase();
      return topic.includes(q) || note.includes(q) || type.includes(q);
    });
  }, [savedEssays, searchQuery]);

  const filteredLibraryBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return libraryBooks;
    return libraryBooks.filter((b) => {
      const text = `${b.title || ''} ${b.subject_label || ''} ${b.r2_key || ''} ${formatGradeLabel(b.grade, isKm)}`.toLowerCase();
      return text.includes(q);
    });
  }, [libraryBooks, searchQuery, isKm]);

  const handleSyncLibraryFromR2 = async () => {
    setIsSyncingLibrary(true);
    setLibraryFeedback(null);
    try {
      const res = await fetch('/api/library/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }
      setLibraryBooks(Array.isArray(data.books) ? data.books : []);
      setLibraryTotalBytes(Number(data.totalSizeBytes || 0));
      setLibraryConfigured(true);
      setLibraryFeedback({
        type: 'success',
        message: isKm
          ? `បានធ្វើសមកាលកម្មសៀវភៅ ${data.totalBooks} ក្បាលពី R2 ដោយជោគជ័យ${data.supabaseSynced ? ' (រក្សាក្នុង Supabase រួចរាល់)' : ''}។`
          : `Synced ${data.totalBooks} books from R2 successfully.`,
      });
    } catch (err) {
      setLibraryFeedback({
        type: 'error',
        message: err?.message || (isKm ? 'ការធ្វើសមកាលកម្មបរាជ័យ។' : 'Sync failed.'),
      });
    } finally {
      setIsSyncingLibrary(false);
    }
  };

  const handleUploadLibraryBook = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setLibraryFeedback({
        type: 'error',
        message: isKm ? 'សូមជ្រើសរើសឯកសារ PDF ជាមុនសិន។' : 'Please select a PDF file first.',
      });
      return;
    }
    setIsUploadingBook(true);
    setLibraryFeedback(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('grade', uploadGrade);
      if (uploadTitle.trim()) {
        formData.append('title', uploadTitle.trim());
      }
      const res = await fetch('/api/library/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      // Auto-extract Page 1 cover from the selected local PDF file and upload to R2
      if (data.book?.r2_key) {
        try {
          const coverBlob = await extractCoverBlobFromFile(uploadFile, 380);
          if (coverBlob) {
            await uploadBookCoverBlob(data.book.r2_key, coverBlob);
          }
        } catch {
          // Non-fatal if cover extraction fails
        }
      }

      setUploadTitle('');
      setUploadFile(null);
      await loadRealData();
      setLibraryFeedback({
        type: 'success',
        message: isKm
          ? `បានបញ្ជូន «${data.book?.title || uploadFile.name}» ទៅ R2 រួចរាល់។`
          : `Uploaded "${data.book?.title || uploadFile.name}" to R2.`,
      });
    } catch (err) {
      setLibraryFeedback({
        type: 'error',
        message: err?.message || (isKm ? 'មិនអាចបញ្ជូនឯកសារបានទេ។' : 'Upload failed.'),
      });
    } finally {
      setIsUploadingBook(false);
    }
  };

  const handleGenerateMissingCovers = async () => {
    const missing = libraryBooks.filter((b) => !b.cover_url);
    if (missing.length === 0) {
      setLibraryFeedback({
        type: 'success',
        message: isKm ? 'សៀវភៅទាំងអស់មានរូបក្របរួចរាល់ហើយ។' : 'All books already have cover images.',
      });
      return;
    }

    setIsGeneratingCovers(true);
    setLibraryFeedback(null);
    setCoverGenProgress({ done: 0, total: missing.length });

    let successCount = 0;
    for (let i = 0; i < missing.length; i++) {
      const book = missing[i];
      try {
        const res = await extractAndStoreBookCover(book);
        const finalCover = res?.coverUrl || res?.localUrl;
        if (finalCover) {
          successCount++;
          setLibraryBooks((prev) =>
            prev.map((item) =>
              item.r2_key === book.r2_key ? { ...item, cover_url: finalCover } : item
            )
          );
        }
      } catch {
        // Continue with next book
      }
      setCoverGenProgress({ done: i + 1, total: missing.length });
    }

    setIsGeneratingCovers(false);
    setLibraryFeedback({
      type: successCount > 0 ? 'success' : 'error',
      message: isKm
        ? `បានបង្កើត និងរក្សាទុករូបក្របសៀវភៅចំនួន ${successCount}/${missing.length} ក្បាលទៅ R2 រួចរាល់។`
        : `Generated and saved ${successCount}/${missing.length} book covers to R2.`,
    });
  };

  const handleDeleteLibraryBook = async (book) => {
    setDeletingKey(book.r2_key);
    setLibraryFeedback(null);
    try {
      const res = await fetch(`/api/library/books?key=${encodeURIComponent(book.r2_key)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Delete failed');
      }
      setLibraryBooks((prev) => prev.filter((item) => item.r2_key !== book.r2_key));
      setLibraryTotalBytes((prev) => Math.max(0, prev - Number(book.file_size || 0)));
      setLibraryFeedback({
        type: 'success',
        message: isKm ? `បានលុប «${book.title}» ចេញពី R2។` : `Deleted "${book.title}" from R2.`,
      });
    } catch (err) {
      setLibraryFeedback({
        type: 'error',
        message: err?.message || (isKm ? 'មិនអាចលុបសៀវភៅបានទេ។' : 'Delete failed.'),
      });
    } finally {
      setDeletingKey(null);
    }
  };

  const adminTabs = [
    {
      id: 'overview',
      labelKm: 'ទិដ្ឋភាពទូទៅ',
      labelEn: 'Overview',
      icon: BarChart3,
    },
    {
      id: 'library',
      labelKm: 'បណ្ណាល័យ',
      labelEn: 'Library',
      icon: Library,
    },
    {
      id: 'users',
      labelKm: 'អ្នកប្រើប្រាស់',
      labelEn: 'Users',
      icon: Users,
    },
    {
      id: 'content',
      labelKm: 'តែងសេចក្ដីរក្សាទុក',
      labelEn: 'Saved Essays',
      icon: BookOpen,
    },
    {
      id: 'settings',
      labelKm: 'ប្រព័ន្ធ',
      labelEn: 'System',
      icon: Settings,
    },
  ];

  // If not admin, show clean admin access gate
  if (!isAuthenticated || !isAdmin) {
    return (
      <div id="admin-restricted-view" className="space-y-6 font-kh-body">
        <div className="pb-4 border-b border-white/10">
          <h1 className="font-kh-title text-2xl text-white tracking-wide">
            {t('pages.admin.title')}
          </h1>
        </div>

        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-10 sm:p-16 text-center space-y-5 max-w-lg mx-auto my-8">
          <div className="h-14 w-14 bg-white/[0.08] rounded-2xl flex items-center justify-center text-[#38BDF8] mx-auto">
            <Lock className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h3 className="font-kh-title text-xl text-white">
              {isKm ? 'ទាមទារសិទ្ធិជា Admin' : 'Admin Privileges Required'}
            </h3>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
              {isKm
                ? 'ទំព័រនេះសម្រាប់តែគណនី Admin ប៉ុណ្ណោះ។'
                : 'This panel is restricted to administrator accounts.'}
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              size="md"
              leftIcon={LogIn}
              onClick={() => setIsLoginOpen(true)}
            >
              {isKm ? 'ចូលគណនី Admin' : 'Sign In as Admin'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-page-container" className="space-y-6 font-kh-body pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <h1 className="font-kh-title text-2xl text-white tracking-wide">
            {t('pages.admin.title')}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/75">
            <span className="inline-flex items-center gap-1 font-semibold text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span>Admin · {currentUser?.first_name || 'Admin'}</span>
            </span>
            {dataSourceLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>{dataSourceLabel}</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={loadRealData}
          disabled={isLoadingData}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/15 rounded-xl transition-colors self-start sm:self-center cursor-pointer disabled:opacity-60"
        >
          {isLoadingData ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 text-white" />
          )}
          <span>{isKm ? 'ធ្វើបច្ចុប្បន្នភាព' : 'Refresh'}</span>
        </button>
      </div>

      {/* Admin Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-xl overflow-x-auto select-none">
        {adminTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          const label = isKm ? tab.labelKm : tab.labelEn;

          return (
            <button
              key={tab.id}
              id={`admin-tab-${tab.id}`}
              type="button"
              onClick={() => {
                setActiveAdminTab(tab.id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-white/18 text-white font-semibold'
                  : 'text-white/75 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Real Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            titleKm: 'អ្នកប្រើប្រាស់សរុប',
            titleEn: 'Registered Users',
            value: students.length.toLocaleString(),
            subKm: 'គណនីចុះឈ្មោះក្នុងប្រព័ន្ធ',
            subEn: 'Registered accounts',
            icon: Users,
          },
          {
            titleKm: 'តែងសេចក្ដីរក្សាទុក',
            titleEn: 'Saved Essays',
            value: savedEssays.length.toLocaleString(),
            subKm: 'ទិន្នន័យលើឧបករណ៍នេះ',
            subEn: 'Stored on this device',
            icon: BookOpen,
          },
          {
            titleKm: 'ទំហំផ្ទុកក្នុងម៉ាស៊ីន',
            titleEn: 'Local Storage Used',
            value: storageSizeLabel,
            subKm: 'ទំហំប្រើប្រាស់ជាក់ស្ដែង',
            subEn: 'Actual browser storage',
            icon: Database,
          },
          {
            titleKm: 'ការតភ្ជាប់ប្រព័ន្ធ',
            titleEn: 'Connection Status',
            value: isOnline ? (isKm ? 'អនឡាញ' : 'Online') : 'Offline',
            subKm: isSupabaseConfigured
              ? isKm
                ? 'Database បានភ្ជាប់'
                : 'Database connected'
              : isKm
              ? 'ប្រើប្រាស់ក្នុងម៉ាស៊ីន'
              : 'Local mode',
            icon: isOnline ? Wifi : WifiOff,
          },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2"
            >
              <div className="flex items-center justify-between text-white/75">
                <span className="text-xs font-medium">
                  {isKm ? stat.titleKm : stat.titleEn}
                </span>
                <Icon className="h-4 w-4 text-white/75" />
              </div>
              <div className="text-2xl font-bold text-white font-kh-title tabular-nums">
                {stat.value}
              </div>
              <div className="text-xs text-white/75">
                {isKm ? stat.subKm : stat.subEn}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeAdminTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card
            title={isKm ? 'គណនីសិស្សចុងក្រោយ' : 'Recent Student Accounts'}
          >
            {students.length === 0 ? (
              <div className="py-8 text-center text-xs sm:text-sm text-white/70">
                {isKm ? 'មិនទាន់មានគណនីចុះឈ្មោះនៅឡើយទេ' : 'No registered accounts yet'}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {students.slice(0, 5).map((s, idx) => (
                  <div key={s.id || s.student_id || idx} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {`${s.last_name || ''} ${s.first_name || ''}`.trim() || s.email || s.student_id}
                      </p>
                      <p className="text-xs text-white/75 tabular-nums truncate">
                        {s.student_id} · {s.grade || '-'}
                      </p>
                    </div>
                    <span className="text-xs text-white/75 shrink-0">
                      {s.role || 'student'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title={isKm ? 'តែងសេចក្ដីរក្សាទុកចុងក្រោយ' : 'Recent Saved Essays'}
          >
            {savedEssays.length === 0 ? (
              <div className="py-8 text-center text-xs sm:text-sm text-white/70">
                {isKm ? 'មិនទាន់មានតែងសេចក្ដីរក្សាទុកទេ' : 'No saved essays yet'}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {savedEssays.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-2.5 space-y-1">
                    <p className="text-sm font-medium text-white line-clamp-1">
                      {item.essay?.detected_topic}
                    </p>
                    <p className="text-xs text-white/75 tabular-nums">
                      {item.essay?.essay_type_label} · {getGradeLabel(item.grade, isKm)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeAdminTab === 'library' && (
        <div className="space-y-4">
          {libraryFeedback && (
            <div
              className={`rounded-xl px-4 py-3 border text-xs sm:text-sm flex items-center gap-2 bg-transparent ${
                libraryFeedback.type === 'success'
                  ? 'border-emerald-400/55 text-emerald-300'
                  : 'border-rose-400/55 text-rose-300'
              }`}
            >
              {libraryFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{libraryFeedback.message}</span>
            </div>
          )}

          {/* R2 Connection & Sync Card */}
          <Card
            title={isKm ? 'ការគ្រប់គ្រងបណ្ណាល័យ Cloudflare R2' : 'Cloudflare R2 Library'}
            subtitle={
              libraryConfigured
                ? isKm
                  ? `Bucket: ${libraryBucketName} · សរុប ${libraryBooks.length} ក្បាល (${formatFileSize(libraryTotalBytes)}) · មានរូបក្រប ${libraryBooks.filter((b) => Boolean(b.cover_url)).length}/${libraryBooks.length}`
                  : `Bucket: ${libraryBucketName} · ${libraryBooks.length} books (${formatFileSize(libraryTotalBytes)}) · ${libraryBooks.filter((b) => Boolean(b.cover_url)).length}/${libraryBooks.length} covers`
                : isKm
                ? 'សូមកំណត់អថេរ R2 (R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL) នៅក្នុង Server Secrets / .env'
                : 'Configure R2 server environment variables (R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL).'
            }
            headerAction={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateMissingCovers}
                  disabled={
                    isGeneratingCovers ||
                    !libraryConfigured ||
                    libraryBooks.every((b) => Boolean(b.cover_url))
                  }
                  className="min-h-[38px] inline-flex items-center gap-2 px-3.5 py-2 bg-white/[0.08] hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingCovers ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span className="tabular-nums">
                        {isKm
                          ? `កំពុងបង្កើតក្រប (${coverGenProgress.done}/${coverGenProgress.total})`
                          : `Covers (${coverGenProgress.done}/${coverGenProgress.total})`}
                      </span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5 text-white" />
                      <span>{isKm ? 'បង្កើតរូបក្របសៀវភៅ' : 'Generate Covers'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSyncLibraryFromR2}
                  disabled={isSyncingLibrary || !libraryConfigured}
                  className="min-h-[38px] inline-flex items-center gap-2 px-4 py-2 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isSyncingLibrary ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>{isKm ? 'Sync ពី R2 Bucket' : 'Sync from R2'}</span>
                </button>
              </div>
            }
          >
            <form onSubmit={handleUploadLibraryBook} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-3 space-y-1">
                <label className="block text-xs font-medium text-white/80">
                  {isKm ? 'ថ្នាក់' : 'Grade'}
                </label>
                <select
                  value={uploadGrade}
                  onChange={(e) => setUploadGrade(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white [&_option]:bg-[#194350] [&_option]:text-white focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8]"
                >
                  {LIBRARY_GRADES.map((g) => (
                    <option key={g} value={String(g)}>
                      {formatGradeLabel(g, isKm)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="block text-xs font-medium text-white/80">
                  {isKm ? 'ចំណងជើង (ជម្រើស — ទុកទំនេរយកតាមឈ្មោះ File)' : 'Title (optional)'}
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder={isKm ? 'ឧ. គណិតវិទ្យា ភាគ ១' : 'e.g. Mathematics Part 1'}
                  className="w-full min-h-[40px] px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8]"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="block text-xs font-medium text-white/80">
                  {isKm ? 'ឯកសារ PDF' : 'PDF File'}
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full min-h-[40px] px-2.5 py-1.5 bg-white/[0.04] border border-white/15 rounded-xl text-xs text-white file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-white/12 file:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isUploadingBook || !libraryConfigured || !uploadFile}
                  className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  {isUploadingBook ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{isKm ? 'Upload' : 'Upload'}</span>
                </button>
              </div>
            </form>
          </Card>

          {/* Books Table */}
          <Card title={isKm ? 'បញ្ជីសៀវភៅក្នុង R2' : 'Books in R2'}>
            <div className="space-y-4">
              {libraryBooks.length > 0 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isKm ? 'ស្វែងរកសៀវភៅ មុខវិជ្ជា ឬថ្នាក់...' : 'Search books...'}
                    className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8]"
                  />
                </div>
              )}

              {filteredLibraryBooks.length === 0 ? (
                <div className="py-10 text-center text-sm text-white/70">
                  {libraryConfigured
                    ? isKm
                      ? 'មិនទាន់មានឯកសារ PDF ក្នុង Bucket ទេ'
                      : 'No PDF files found in bucket'
                    : isKm
                    ? 'រង់ចាំការភ្ជាប់ Cloudflare R2 Environment Variables'
                    : 'Waiting for Cloudflare R2 configuration'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/80 font-semibold">
                        <th className="py-2.5 pr-3">{isKm ? 'ចំណងជើង' : 'Title'}</th>
                        <th className="py-2.5 px-3">{isKm ? 'ថ្នាក់' : 'Grade'}</th>
                        <th className="py-2.5 px-3">{isKm ? 'មុខវិជ្ជា' : 'Subject'}</th>
                        <th className="py-2.5 px-3">{isKm ? 'ទំហំ' : 'Size'}</th>
                        <th className="py-2.5 pl-3 text-right">{isKm ? 'សកម្មភាព' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredLibraryBooks.map((book) => (
                        <tr key={book.r2_key} className="hover:bg-white/5">
                          <td className="py-2.5 pr-3 font-medium text-white max-w-[280px]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {book.cover_url ? (
                                <img
                                  src={book.cover_url}
                                  alt={book.title}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-11 rounded object-cover object-top shrink-0 bg-white/10"
                                />
                              ) : (
                                <div className="w-8 h-11 rounded bg-white/[0.07] text-white/60 flex items-center justify-center shrink-0">
                                  <BookOpen className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <span className="truncate">{book.title}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-white/80 whitespace-nowrap tabular-nums">
                            {formatGradeLabel(book.grade, isKm)}
                          </td>
                          <td className="py-2.5 px-3 text-white/80 whitespace-nowrap">
                            {book.subject_label}
                          </td>
                          <td className="py-2.5 px-3 text-white/80 whitespace-nowrap tabular-nums">
                            {formatFileSize(book.file_size)}
                          </td>
                          <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <a
                                href={book.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-white/75 hover:text-white rounded-md hover:bg-white/10"
                                title={isKm ? 'បើកមើល' : 'Open'}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                type="button"
                                disabled={deletingKey === book.r2_key}
                                onClick={() => handleDeleteLibraryBook(book)}
                                className="p-1.5 text-white/70 hover:text-rose-300 rounded-md hover:bg-rose-500/15 cursor-pointer disabled:opacity-50"
                                title={isKm ? 'លុប' : 'Delete'}
                              >
                                {deletingKey === book.r2_key ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeAdminTab === 'users' && (
        <Card title={isKm ? 'បញ្ជីអ្នកប្រើប្រាស់' : 'Registered Users'}>
          <div className="space-y-4">
            {students.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isKm ? 'ស្វែងរកតាមឈ្មោះ ឬ ID...' : 'Search by name or ID...'}
                  className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8]"
                />
              </div>
            )}

            {filteredStudents.length === 0 ? (
              <div className="py-10 text-center text-sm text-white/70">
                {isKm ? 'មិនមានទិន្នន័យអ្នកប្រើប្រាស់' : 'No user records found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/80 font-semibold">
                      <th className="py-2.5 pr-3">ID</th>
                      <th className="py-2.5 px-3">{isKm ? 'ឈ្មោះ' : 'Name'}</th>
                      <th className="py-2.5 px-3">{isKm ? 'ថ្នាក់' : 'Grade'}</th>
                      <th className="py-2.5 px-3">{isKm ? 'អ៊ីម៉ែល' : 'Email'}</th>
                      <th className="py-2.5 pl-3">{isKm ? 'តួនាទី' : 'Role'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredStudents.map((s, idx) => (
                      <tr key={s.id || s.student_id || idx} className="hover:bg-white/5">
                        <td className="py-2.5 pr-3 font-medium text-white tabular-nums whitespace-nowrap">
                          {s.student_id || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-white whitespace-nowrap">
                          {`${s.last_name || ''} ${s.first_name || ''}`.trim() || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-white/80 whitespace-nowrap">
                          {s.grade || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-white/80 max-w-[200px] truncate">
                          {s.email || '-'}
                        </td>
                        <td className="py-2.5 pl-3 text-white/80 whitespace-nowrap">
                          {s.role || 'student'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeAdminTab === 'content' && (
        <Card title={isKm ? 'តែងសេចក្ដីរក្សាទុកជាក់ស្ដែង' : 'Stored Essays'}>
          <div className="space-y-4">
            {savedEssays.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isKm ? 'ស្វែងរកប្រធាន...' : 'Search topic...'}
                  className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8]"
                />
              </div>
            )}

            {filteredEssays.length === 0 ? (
              <div className="py-10 text-center text-sm text-white/70">
                {isKm ? 'មិនមានតែងសេចក្ដីរក្សាទុកទេ' : 'No saved essays found'}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredEssays.map((item) => (
                  <div key={item.id} className="py-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/75 tabular-nums">
                      <span className="font-semibold text-white">
                        {item.essay?.essay_type_label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{getGradeLabel(item.grade, isKm)}</span>
                      {item.wordCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {isKm ? `${item.wordCount.toLocaleString()} ពាក្យ` : `${item.wordCount.toLocaleString()} words`}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white">
                      {item.essay?.detected_topic}
                    </p>
                    {item.note && (
                      <p className="text-xs text-white/80">
                        {isKm ? `កំណត់ចំណាំ៖ ${item.note}` : `Note: ${item.note}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {activeAdminTab === 'settings' && (
        <Card title={isKm ? 'ស្ថានភាពប្រព័ន្ធ' : 'System Status'}>
          <div className="divide-y divide-white/10 text-xs sm:text-sm">
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-white/75">{isKm ? 'ការតភ្ជាប់បណ្ដាញ' : 'Network'}</span>
              <span className="font-semibold text-white">
                {isOnline ? (isKm ? 'អនឡាញ' : 'Online') : 'Offline'}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-white/75">{isKm ? 'ការភ្ជាប់ Database' : 'Database'}</span>
              <span className="font-semibold text-white">
                {isSupabaseConfigured ? (isKm ? 'បានកំណត់រួចរាល់' : 'Configured') : (isKm ? 'មិនទាន់កំណត់' : 'Not configured')}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-white/75">{isKm ? 'ទំហំផ្ទុកក្នុងម៉ាស៊ីន' : 'Browser Storage'}</span>
              <span className="font-semibold text-white tabular-nums">{storageSizeLabel}</span>
            </div>
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-white/75">Service Worker (Offline)</span>
              <span className="font-semibold text-white">
                {typeof navigator !== 'undefined' && 'serviceWorker' in navigator
                  ? isKm
                    ? 'គាំទ្រ'
                    : 'Supported'
                  : isKm
                  ? 'មិនគាំទ្រ'
                  : 'Unsupported'}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
