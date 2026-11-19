import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  Users,
  BookOpen,
  BarChart3,
  Lock,
  LogIn,
  RefreshCw,
  Search,
  Library,
  Upload,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import Button from '../components/common/Button';
import DotsLoader from '../components/common/DotsLoader';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSavedEssays, hydrateSavedEssaysFromOfflineDB } from '../utils/savedEssays';
import { getGradeLabel } from '../data/essayPresets';
import { LIBRARY_GRADES, formatGradeLabel, formatFileSize } from '../data/librarySubjects';
import { useOnlineStatus } from '../hooks/usePWA';
import { saveCachedBookCatalog } from '../utils/offlineLibrary';
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

const R2_MULTIPART_PART_SIZE = 8 * 1024 * 1024; // 8 MB (>= 5 MB S3/R2 minimum and < 32 MB Cloud Run limit)
const MAX_LIBRARY_PDF_BYTES = 500 * 1024 * 1024;

async function parseResponseJsonSafely(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 413) {
      return { error: 'ទំហំសំណើធំពេក (413)។ សូមព្យាយាមម្ដងទៀត!' };
    }
    return { error: text.slice(0, 180) };
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
  const [libraryTotalBytes, setLibraryTotalBytes] = useState(0);
  const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);
  const [libraryFeedback, setLibraryFeedback] = useState(null);
  const [uploadGrade, setUploadGrade] = useState('12');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploadingBook, setIsUploadingBook] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const uploadFileInputRef = useRef(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const [editingBookKey, setEditingBookKey] = useState(null);
  const [editingBookTitle, setEditingBookTitle] = useState('');
  const [isSavingBookTitle, setIsSavingBookTitle] = useState(false);
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
          setDataSourceLabel('Database');
        } else {
          setDataSourceLabel(isKm ? 'ក្នុងម៉ាស៊ីន' : 'Local');
        }
      } else {
        setDataSourceLabel(isKm ? 'ក្នុងម៉ាស៊ីន' : 'Local');
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

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLibraryFeedback({
        type: 'error',
        message: isKm
          ? 'គ្មានអ៊ីនធឺណិត — សូមភ្ជាប់អ៊ីនធឺណិតដើម្បី Upload សៀវភៅ។'
          : 'Offline — please reconnect to upload books.',
      });
      return;
    }

    const isPdfExt = /\.pdf$/i.test(uploadFile.name || '');
    const isPdfMime = uploadFile.type === 'application/pdf';
    if (!isPdfExt && !isPdfMime) {
      setLibraryFeedback({
        type: 'error',
        message: isKm ? 'អនុញ្ញាតតែឯកសារ PDF ប៉ុណ្ណោះ។' : 'Only PDF files are allowed.',
      });
      return;
    }

    if (uploadFile.size <= 0 || uploadFile.size > MAX_LIBRARY_PDF_BYTES) {
      setLibraryFeedback({
        type: 'error',
        message: isKm
          ? 'ទំហំឯកសារ PDF មិនត្រឹមត្រូវ ឬលើសពី 500MB។'
          : 'PDF file size is invalid or exceeds 500MB.',
      });
      return;
    }

    const selectedFile = uploadFile;
    const selectedFileName = selectedFile.name || 'book.pdf';
    const trimmedTitle = uploadTitle.trim();

    setIsUploadingBook(true);
    setLibraryFeedback(null);
    setUploadProgress({
      loadedBytes: 0,
      totalBytes: selectedFile.size,
      percent: 0,
      stage: 'uploading',
    });

    let activeMultipart = null;

    try {
      let data = null;

      if (selectedFile.size <= R2_MULTIPART_PART_SIZE) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('grade', uploadGrade);
        if (trimmedTitle) {
          formData.append('title', trimmedTitle);
        }
        const res = await fetch('/api/library/upload', {
          method: 'POST',
          body: formData,
        });
        data = await parseResponseJsonSafely(res);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Upload failed');
        }
        setUploadProgress({
          loadedBytes: selectedFile.size,
          totalBytes: selectedFile.size,
          percent: 100,
          stage: 'cover',
        });
      } else {
        // Chunked R2 multipart upload (each part = 8MB so Cloud Run 32MB limit is never hit)
        const initRes = await fetch('/api/library/upload/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedFileName,
            grade: uploadGrade,
            title: trimmedTitle,
            contentType: selectedFile.type || 'application/pdf',
            fileSize: selectedFile.size,
          }),
        });
        const initData = await parseResponseJsonSafely(initRes);
        if (!initRes.ok || !initData?.ok || !initData?.uploadId || !initData?.key) {
          throw new Error(initData?.error || 'Could not initialize upload');
        }

        activeMultipart = { uploadId: initData.uploadId, key: initData.key };
        const totalParts = Math.ceil(selectedFile.size / R2_MULTIPART_PART_SIZE);
        const uploadedParts = [];

        for (let partIndex = 0; partIndex < totalParts; partIndex++) {
          const partNumber = partIndex + 1;
          const start = partIndex * R2_MULTIPART_PART_SIZE;
          const end = Math.min(selectedFile.size, start + R2_MULTIPART_PART_SIZE);
          const chunk = selectedFile.slice(start, end);

          let partData = null;
          let lastPartErr = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const partRes = await fetch(
                `/api/library/upload/part?uploadId=${encodeURIComponent(
                  activeMultipart.uploadId
                )}&key=${encodeURIComponent(activeMultipart.key)}&partNumber=${partNumber}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/octet-stream' },
                  body: chunk,
                }
              );
              const parsed = await parseResponseJsonSafely(partRes);
              if (!partRes.ok || !parsed?.ok || !parsed?.ETag) {
                throw new Error(parsed?.error || `Failed to upload part ${partNumber}`);
              }
              partData = parsed;
              break;
            } catch (err) {
              lastPartErr = err;
            }
          }

          if (!partData) {
            throw lastPartErr || new Error(`Failed to upload part ${partNumber}`);
          }

          uploadedParts.push({ PartNumber: partNumber, ETag: partData.ETag });
          setUploadProgress({
            loadedBytes: end,
            totalBytes: selectedFile.size,
            percent: Math.min(99, Math.round((end / selectedFile.size) * 100)),
            stage: 'uploading',
          });
        }

        const completeRes = await fetch('/api/library/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId: activeMultipart.uploadId,
            key: activeMultipart.key,
            grade: uploadGrade,
            title: trimmedTitle,
            fileSize: selectedFile.size,
            parts: uploadedParts,
          }),
        });
        data = await parseResponseJsonSafely(completeRes);
        if (!completeRes.ok || !data?.ok) {
          throw new Error(data?.error || 'Failed to finalize book upload');
        }
        activeMultipart = null;
        setUploadProgress({
          loadedBytes: selectedFile.size,
          totalBytes: selectedFile.size,
          percent: 100,
          stage: 'cover',
        });
      }

      // Auto-extract Page 1 cover from the selected local PDF file and upload to R2
      if (data?.book?.r2_key) {
        try {
          const coverBlob = await extractCoverBlobFromFile(selectedFile, 380);
          if (coverBlob) {
            await uploadBookCoverBlob(data.book.r2_key, coverBlob);
          }
        } catch {
          // Non-fatal if cover extraction fails
        }
      }

      setUploadProgress((prev) => (prev ? { ...prev, stage: 'refreshing' } : null));
      setUploadTitle('');
      setUploadFile(null);
      if (uploadFileInputRef.current) {
        uploadFileInputRef.current.value = '';
      }
      await loadRealData();
      setLibraryFeedback({
        type: 'success',
        message: isKm
          ? `បានបញ្ជូន «${data?.book?.title || selectedFileName}» ទៅ R2 រួចរាល់។`
          : `Uploaded "${data?.book?.title || selectedFileName}" to R2.`,
      });
    } catch (err) {
      if (activeMultipart) {
        fetch('/api/library/upload/abort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeMultipart),
        }).catch(() => {});
      }
      setLibraryFeedback({
        type: 'error',
        message: err?.message || (isKm ? 'មិនអាចបញ្ជូនឯកសារបានទេ។' : 'Upload failed.'),
      });
    } finally {
      setIsUploadingBook(false);
      setUploadProgress(null);
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

  const handleStartEditBook = (book) => {
    setEditingBookKey(book.r2_key);
    setEditingBookTitle(book.title || '');
    setLibraryFeedback(null);
  };

  const handleCancelEditBook = () => {
    setEditingBookKey(null);
    setEditingBookTitle('');
  };

  const handleSaveBookTitle = async (book) => {
    const trimmed = editingBookTitle.trim();
    if (!trimmed) {
      setLibraryFeedback({
        type: 'error',
        message: isKm ? 'សូមបញ្ចូលចំណងជើងសៀវភៅ។' : 'Please enter a book title.',
      });
      return;
    }

    if (trimmed === (book.title || '').trim()) {
      handleCancelEditBook();
      return;
    }

    setIsSavingBookTitle(true);
    setLibraryFeedback(null);
    try {
      const res = await fetch('/api/library/books', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: book.r2_key,
          title: trimmed,
          fileSize: book.file_size,
          lastModified: book.last_modified,
          coverUrl: book.cover_url,
        }),
      });
      const data = await parseResponseJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Update failed');
      }

      setLibraryBooks((prev) => {
        const next = prev.map((item) =>
          item.r2_key === book.r2_key
            ? {
                ...item,
                title: data.book?.title || trimmed,
                subject: data.book?.subject || item.subject,
                subject_label: data.book?.subject_label || item.subject_label,
              }
            : item
        );
        saveCachedBookCatalog(next);
        return next;
      });

      setEditingBookKey(null);
      setEditingBookTitle('');
      setLibraryFeedback({
        type: 'success',
        message: isKm ? 'បានកែចំណងជើងសៀវភៅរួចរាល់។' : 'Book title updated.',
      });
    } catch (err) {
      setLibraryFeedback({
        type: 'error',
        message: err?.message || (isKm ? 'មិនអាចកែចំណងជើងសៀវភៅបានទេ។' : 'Failed to update title.'),
      });
    } finally {
      setIsSavingBookTitle(false);
    }
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
      setLibraryBooks((prev) => {
        const next = prev.filter((item) => item.r2_key !== book.r2_key);
        saveCachedBookCatalog(next);
        return next;
      });
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
      labelKm: 'ទូទៅ',
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
      labelKm: 'សិស្ស',
      labelEn: 'Students',
      icon: Users,
    },
    {
      id: 'content',
      labelKm: 'តែងសេចក្ដី',
      labelEn: 'Essays',
      icon: BookOpen,
    },
  ];

  const missingCoversCount = useMemo(
    () => libraryBooks.filter((b) => !b.cover_url).length,
    [libraryBooks]
  );

  // If not admin, show clean admin access gate
  if (!isAuthenticated || !isAdmin) {
    return (
      <div id="admin-restricted-view" className="space-y-6 font-kh-body">
        <div className="pb-4 border-b border-white/10">
          <h1 className="font-kh-title text-2xl text-white tracking-wide">
            {t('pages.admin.title')}
          </h1>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-10 sm:p-14 text-center space-y-5 max-w-md mx-auto my-8">
          <div className="h-12 w-12 bg-white/[0.08] rounded-xl flex items-center justify-center text-[#38BDF8] mx-auto">
            <Lock className="h-6 w-6" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-kh-title text-lg text-white">
              {isKm ? 'សម្រាប់តែអ្នកគ្រប់គ្រង' : 'Admin Access Only'}
            </h3>
            <p className="text-xs sm:text-sm text-white/70">
              {isKm ? 'សូមចូលគណនីអ្នកគ្រប់គ្រងដើម្បីបន្ត។' : 'Sign in with an administrator account.'}
            </p>
          </div>

          <div className="pt-1 flex justify-center">
            <Button
              variant="primary"
              size="md"
              leftIcon={LogIn}
              onClick={() => setIsLoginOpen(true)}
            >
              {isKm ? 'ចូលគណនី' : 'Sign In'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-page-container" className="space-y-5 font-kh-body pb-10">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="space-y-1 min-w-0">
          <h1 className="font-kh-title text-xl sm:text-2xl text-white tracking-wide">
            {t('pages.admin.title')}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            <span className="inline-flex items-center gap-1.5 font-medium text-white/90">
              <ShieldCheck className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" />
              <span>{currentUser?.first_name || 'Admin'}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{isOnline ? (isKm ? 'អនឡាញ' : 'Online') : 'Offline'}</span>
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
          className="h-9 inline-flex items-center gap-2 px-3.5 text-xs font-semibold text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isLoadingData ? (
            <DotsLoader size="xs" color="white" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 text-white/85" />
          )}
          <span>{isKm ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}</span>
        </button>
      </div>

      {/* Unified Essential Metrics Strip */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 overflow-hidden">
        {[
          {
            id: 'library',
            label: isKm ? 'សៀវភៅ' : 'Books',
            value: libraryBooks.length.toLocaleString(),
            clickable: true,
          },
          {
            id: 'users',
            label: isKm ? 'សិស្ស' : 'Students',
            value: students.length.toLocaleString(),
            clickable: true,
          },
          {
            id: 'content',
            label: isKm ? 'តែងសេចក្ដី' : 'Essays',
            value: savedEssays.length.toLocaleString(),
            clickable: true,
          },
          {
            id: 'storage',
            label: isKm ? 'ទំហំឯកសារ' : 'Storage',
            value: libraryTotalBytes > 0 ? formatFileSize(libraryTotalBytes) : storageSizeLabel,
            clickable: false,
          },
        ].map((stat) => {
          const inner = (
            <>
              <div className="font-kh-title text-xl sm:text-2xl text-white tabular-nums leading-none">
                {stat.value}
              </div>
              <div className="text-xs text-white/65 font-medium whitespace-nowrap">
                {stat.label}
              </div>
            </>
          );

          if (stat.clickable) {
            return (
              <button
                key={stat.id}
                type="button"
                onClick={() => {
                  setActiveAdminTab(stat.id);
                  setSearchQuery('');
                }}
                className={`py-4 px-4 flex flex-col items-center justify-center text-center gap-1.5 transition-colors cursor-pointer ${
                  activeAdminTab === stat.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                }`}
              >
                {inner}
              </button>
            );
          }

          return (
            <div
              key={stat.id}
              className="py-4 px-4 flex flex-col items-center justify-center text-center gap-1.5"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* Concise Navigation Tabs */}
      <div className="inline-flex w-full sm:w-auto items-center gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl overflow-x-auto select-none">
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
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-white/[0.14] text-white font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeAdminTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Students */}
          <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">
                {isKm ? 'សិស្សចុងក្រោយ' : 'Recent Students'}
              </h2>
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveAdminTab('users');
                    setSearchQuery('');
                  }}
                  className="text-xs font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  {isKm ? 'មើលទាំងអស់' : 'View all'}
                </button>
              )}
            </div>
            <div className="px-4 sm:px-5">
              {students.length === 0 ? (
                <div className="py-10 text-center text-xs text-white/60">
                  {isKm ? 'មិនទាន់មានទិន្នន័យសិស្ស' : 'No student records yet'}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {students.slice(0, 5).map((s, idx) => (
                    <div
                      key={s.id || s.student_id || idx}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {`${s.last_name || ''} ${s.first_name || ''}`.trim() || s.email || s.student_id}
                        </p>
                        <p className="text-xs text-white/65 tabular-nums truncate">
                          {s.student_id || '-'}
                          {s.grade ? ` · ${s.grade}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-white/65 shrink-0">
                        {s.role === 'admin' ? (isKm ? 'អ្នកគ្រប់គ្រង' : 'Admin') : isKm ? 'សិស្ស' : 'Student'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Recent Library Books */}
          <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">
                {isKm ? 'សៀវភៅក្នុងបណ្ណាល័យ' : 'Library Books'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setActiveAdminTab('library');
                  setSearchQuery('');
                }}
                className="text-xs font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                {isKm ? 'គ្រប់គ្រង' : 'Manage'}
              </button>
            </div>
            <div className="px-4 sm:px-5">
              {libraryBooks.length === 0 ? (
                <div className="py-10 text-center text-xs text-white/60">
                  {isKm ? 'មិនទាន់មានសៀវភៅទេ' : 'No library books yet'}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {libraryBooks.slice(0, 5).map((book) => (
                    <div
                      key={book.r2_key}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="w-7 h-9 rounded object-cover object-top shrink-0 bg-white/10"
                          />
                        ) : (
                          <div className="w-7 h-9 rounded bg-white/[0.06] text-white/55 flex items-center justify-center shrink-0">
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{book.title}</p>
                          <p className="text-xs text-white/65 truncate tabular-nums">
                            {formatGradeLabel(book.grade, isKm)} · {book.subject_label}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-white/65 tabular-nums whitespace-nowrap shrink-0">
                        {formatFileSize(book.file_size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Library Tab */}
      {activeAdminTab === 'library' && (
        <div className="space-y-4">
          {libraryFeedback && (
            <div
              className={`rounded-xl px-4 py-2.5 border text-xs sm:text-sm flex items-center gap-2 ${
                libraryFeedback.type === 'success'
                  ? 'border-emerald-400/45 text-emerald-300 bg-emerald-500/[0.06]'
                  : 'border-rose-400/45 text-rose-300 bg-rose-500/[0.06]'
              }`}
            >
              {libraryFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{libraryFeedback.message}</span>
            </div>
          )}

          {/* Upload & Sync Section */}
          <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <h2 className="text-sm font-semibold text-white">
                  {isKm ? 'បន្ថែមសៀវភៅ' : 'Upload Book'}
                </h2>
                <p className="text-xs text-white/65 tabular-nums">
                  {libraryConfigured
                    ? isKm
                      ? `${libraryBooks.length} ក្បាល · ${formatFileSize(libraryTotalBytes)}${missingCoversCount > 0 ? ` · ខ្វះក្រប ${missingCoversCount}` : ''}`
                      : `${libraryBooks.length} books · ${formatFileSize(libraryTotalBytes)}${missingCoversCount > 0 ? ` · ${missingCoversCount} missing covers` : ''}`
                    : isKm
                    ? 'មិនទាន់ភ្ជាប់ R2'
                    : 'R2 not configured'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleGenerateMissingCovers}
                  disabled={isGeneratingCovers || !libraryConfigured || missingCoversCount === 0}
                  className="h-9 inline-flex items-center gap-1.5 px-3 bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
                >
                  {isGeneratingCovers ? (
                    <>
                      <DotsLoader size="xs" color="white" />
                      <span className="tabular-nums">
                        {coverGenProgress.done}/{coverGenProgress.total}
                      </span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{isKm ? 'បង្កើតក្រប' : 'Covers'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSyncLibraryFromR2}
                  disabled={isSyncingLibrary || !libraryConfigured}
                  className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
                >
                  {isSyncingLibrary ? (
                    <DotsLoader size="xs" color="dark" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>{isKm ? 'ធ្វើសមកាលកម្ម' : 'Sync'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <form
                onSubmit={handleUploadLibraryBook}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="block text-xs font-medium text-white/75">
                    {isKm ? 'ថ្នាក់' : 'Grade'}
                  </label>
                  <select
                    value={uploadGrade}
                    onChange={(e) => setUploadGrade(e.target.value)}
                    className="w-full h-10 px-3 bg-white/[0.05] border border-white/15 rounded-xl text-sm text-white [&_option]:bg-[#194350] [&_option]:text-white focus:outline-none focus:border-[#38BDF8]"
                  >
                    {LIBRARY_GRADES.map((g) => (
                      <option key={g} value={String(g)}>
                        {formatGradeLabel(g, isKm)}
                      </option>
                    ))}
                    <option value="0">{isKm ? 'ចំណេះដឹងទូទៅ' : 'General'}</option>
                  </select>
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-xs font-medium text-white/75">
                    {isKm ? 'ចំណងជើង' : 'Title'}
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder={isKm ? 'បញ្ចូលចំណងជើងសៀវភៅ' : 'Enter book title'}
                    className="w-full h-10 px-3 bg-white/[0.05] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <label className="block text-xs font-medium text-white/75">
                    {isKm ? 'ឯកសារ PDF' : 'PDF File'}
                  </label>
                  <input
                    ref={uploadFileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full h-10 px-2.5 py-1.5 bg-white/[0.05] border border-white/15 rounded-xl text-xs text-white file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-white/12 file:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isUploadingBook || !libraryConfigured || !uploadFile || !isOnline}
                    className="w-full h-10 inline-flex items-center justify-center gap-1.5 px-4 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45"
                  >
                    {isUploadingBook ? (
                      <DotsLoader size="xs" color="dark" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span className="tabular-nums">
                      {isUploadingBook && uploadProgress
                        ? `${uploadProgress.percent}%`
                        : isKm
                        ? 'បញ្ជូន'
                        : 'Upload'}
                    </span>
                  </button>
                </div>
              </form>

              {isUploadingBook && uploadProgress && (
                <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-white/75 tabular-nums">
                    <span>
                      {uploadProgress.stage === 'cover'
                        ? isKm
                          ? 'កំពុងបង្កើតក្រប...'
                          : 'Generating cover...'
                        : uploadProgress.stage === 'refreshing'
                        ? isKm
                          ? 'កំពុងធ្វើបច្ចុប្បន្នភាព...'
                          : 'Refreshing...'
                        : isKm
                        ? 'កំពុងបញ្ជូន PDF...'
                        : 'Uploading PDF...'}
                    </span>
                    <span>
                      {formatFileSize(uploadProgress.loadedBytes)} /{' '}
                      {formatFileSize(uploadProgress.totalBytes)} ({uploadProgress.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#38BDF8] transition-all duration-200"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Books Table */}
          <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white whitespace-nowrap">
                {isKm ? 'បញ្ជីសៀវភៅ' : 'Books'}{' '}
                <span className="text-white/55 font-normal tabular-nums">
                  ({filteredLibraryBooks.length})
                </span>
              </h2>
              {libraryBooks.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-white/55 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isKm ? 'ស្វែងរកសៀវភៅ...' : 'Search books...'}
                    className="w-full h-9 pl-8 pr-3 bg-white/[0.05] border border-white/15 rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
              )}
            </div>

            {filteredLibraryBooks.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-white/60">
                {isKm ? 'មិនមានសៀវភៅទេ' : 'No books found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/65 font-medium">
                      <th className="py-2.5 pl-4 sm:pl-5 pr-3">{isKm ? 'សៀវភៅ' : 'Title'}</th>
                      <th className="py-2.5 px-3">{isKm ? 'ថ្នាក់' : 'Grade'}</th>
                      <th className="py-2.5 px-3">{isKm ? 'មុខវិជ្ជា' : 'Subject'}</th>
                      <th className="py-2.5 px-3 text-right">{isKm ? 'ទំហំ' : 'Size'}</th>
                      <th className="py-2.5 pl-3 pr-4 sm:pr-5 text-right">{isKm ? 'សកម្មភាព' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredLibraryBooks.map((book) => {
                      const isEditing = editingBookKey === book.r2_key;
                      return (
                        <tr key={book.r2_key} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-2.5 pl-4 sm:pl-5 pr-3 font-medium text-white max-w-[320px]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {book.cover_url ? (
                                <img
                                  src={book.cover_url}
                                  alt={book.title}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="w-7 h-10 rounded object-cover object-top shrink-0 bg-white/10"
                                />
                              ) : (
                                <div className="w-7 h-10 rounded bg-white/[0.06] text-white/55 flex items-center justify-center shrink-0">
                                  <BookOpen className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingBookTitle}
                                  onChange={(e) => setEditingBookTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveBookTitle(book);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      handleCancelEditBook();
                                    }
                                  }}
                                  autoFocus
                                  maxLength={200}
                                  disabled={isSavingBookTitle}
                                  placeholder={isKm ? 'បញ្ចូលចំណងជើងសៀវភៅ' : 'Enter book title'}
                                  className="w-full min-w-[160px] h-9 px-2.5 bg-white/[0.08] border border-[#38BDF8] rounded-lg text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none"
                                />
                              ) : (
                                <span className="truncate">{book.title}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-white/75 whitespace-nowrap tabular-nums">
                            {formatGradeLabel(book.grade, isKm)}
                          </td>
                          <td className="py-2.5 px-3 text-white/75 whitespace-nowrap">
                            {book.subject_label}
                          </td>
                          <td className="py-2.5 px-3 text-white/75 whitespace-nowrap tabular-nums text-right">
                            {formatFileSize(book.file_size)}
                          </td>
                          <td className="py-2.5 pl-3 pr-4 sm:pr-5 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isSavingBookTitle || !editingBookTitle.trim()}
                                  onClick={() => handleSaveBookTitle(book)}
                                  className="p-1.5 text-[#092731] bg-[#38BDF8] hover:bg-[#56CAF9] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                  title={isKm ? 'រក្សាទុក' : 'Save'}
                                >
                                  {isSavingBookTitle ? (
                                    <DotsLoader size="xs" color="dark" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingBookTitle}
                                  onClick={handleCancelEditBook}
                                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                                  title={isKm ? 'បោះបង់' : 'Cancel'}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditBook(book)}
                                  disabled={!isOnline}
                                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                                  title={isKm ? 'កែចំណងជើង' : 'Edit title'}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <a
                                  href={book.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                                  title={isKm ? 'បើកមើល' : 'Open'}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                  type="button"
                                  disabled={deletingKey === book.r2_key}
                                  onClick={() => handleDeleteLibraryBook(book)}
                                  className="p-1.5 text-white/65 hover:text-rose-300 rounded-lg hover:bg-rose-500/15 transition-colors cursor-pointer disabled:opacity-50"
                                  title={isKm ? 'លុប' : 'Delete'}
                                >
                                  {deletingKey === book.r2_key ? (
                                    <DotsLoader size="xs" color="accent" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Students Tab */}
      {activeAdminTab === 'users' && (
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white whitespace-nowrap">
              {isKm ? 'បញ្ជីសិស្ស' : 'Students'}{' '}
              <span className="text-white/55 font-normal tabular-nums">
                ({filteredStudents.length})
              </span>
            </h2>
            {students.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-white/55 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isKm ? 'ស្វែងរកឈ្មោះ ឬ ID...' : 'Search name or ID...'}
                  className="w-full h-9 pl-8 pr-3 bg-white/[0.05] border border-white/15 rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            )}
          </div>

          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs sm:text-sm text-white/60">
              {isKm ? 'មិនមានទិន្នន័យសិស្ស' : 'No student records found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/65 font-medium">
                    <th className="py-2.5 pl-4 sm:pl-5 pr-3">ID</th>
                    <th className="py-2.5 px-3">{isKm ? 'ឈ្មោះ' : 'Name'}</th>
                    <th className="py-2.5 px-3">{isKm ? 'ថ្នាក់' : 'Grade'}</th>
                    <th className="py-2.5 px-3">{isKm ? 'អ៊ីម៉ែល' : 'Email'}</th>
                    <th className="py-2.5 pl-3 pr-4 sm:pr-5 text-right">{isKm ? 'តួនាទី' : 'Role'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredStudents.map((s, idx) => (
                    <tr key={s.id || s.student_id || idx} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 pl-4 sm:pl-5 pr-3 font-mono text-xs text-white/90 tabular-nums whitespace-nowrap">
                        {s.student_id || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white whitespace-nowrap">
                        {`${s.last_name || ''} ${s.first_name || ''}`.trim() || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-white/75 whitespace-nowrap">
                        {s.grade || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-white/75 max-w-[220px] truncate">
                        {s.email || '-'}
                      </td>
                      <td className="py-2.5 pl-3 pr-4 sm:pr-5 text-white/70 whitespace-nowrap text-right">
                        {s.role === 'admin' ? (isKm ? 'អ្នកគ្រប់គ្រង' : 'Admin') : isKm ? 'សិស្ស' : 'Student'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Saved Essays Tab */}
      {activeAdminTab === 'content' && (
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white whitespace-nowrap">
              {isKm ? 'តែងសេចក្ដីរក្សាទុក' : 'Saved Essays'}{' '}
              <span className="text-white/55 font-normal tabular-nums">
                ({filteredEssays.length})
              </span>
            </h2>
            {savedEssays.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-white/55 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isKm ? 'ស្វែងរកប្រធាន...' : 'Search topic...'}
                  className="w-full h-9 pl-8 pr-3 bg-white/[0.05] border border-white/15 rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            )}
          </div>

          <div className="px-4 sm:px-5">
            {filteredEssays.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-white/60">
                {isKm ? 'មិនមានតែងសេចក្ដីរក្សាទុកទេ' : 'No saved essays found'}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredEssays.map((item) => (
                  <div key={item.id} className="py-3.5 space-y-1">
                    <p className="text-sm font-medium text-white">
                      {item.essay?.detected_topic}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/65 tabular-nums">
                      <span>{item.essay?.essay_type_label}</span>
                      <span aria-hidden="true">·</span>
                      <span>{getGradeLabel(item.grade, isKm)}</span>
                      {item.wordCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {isKm
                              ? `${item.wordCount.toLocaleString()} ពាក្យ`
                              : `${item.wordCount.toLocaleString()} words`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
