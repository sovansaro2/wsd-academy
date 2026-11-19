import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  BookOpen,
  Tag,
  Link2,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileUp,
  FileText,
  X,
  WifiOff,
} from 'lucide-react';
import Modal from './Modal';
import Input from './Input';
import DotsLoader from './DotsLoader';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useOnlineStatus } from '../../hooks/usePWA';

const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB Telegram Bot limit

export default function RecommendBookModal({ isOpen, onClose }) {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const isOnline = useOnlineStatus();
  const isKm = language === 'km';

  const defaultUserName = currentUser
    ? `${currentUser.last_name || ''} ${currentUser.first_name || ''}`.trim()
    : '';

  const [recommenderName, setRecommenderName] = useState(defaultUserName);
  const [bookTitle, setBookTitle] = useState('');
  const [bookCategory, setBookCategory] = useState('');
  const [originalSource, setOriginalSource] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [needsBotStart, setNeedsBotStart] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setRecommenderName((prev) => prev || defaultUserName);
      setError('');
      setNeedsBotStart(false);
    } else {
      setSubmittedSuccess(false);
      setError('');
      setNeedsBotStart(false);
    }
  }, [isOpen, defaultUserName]);

  const clearPdf = () => {
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdfMime = file.type === 'application/pdf';
    const isPdfExt = /\.pdf$/i.test(file.name);
    if (!isPdfMime && !isPdfExt) {
      setError(
        isKm
          ? 'សូមជ្រើសរើសតែឯកសារប្រភេទ PDF ប៉ុណ្ណោះ។'
          : 'Please select a PDF file only.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      setError(
        isKm
          ? 'ទំហំឯកសារ PDF មិនអាចលើសពី 50MB បានទេ (ដែនកំណត់ Telegram)។'
          : 'PDF file size cannot exceed 50MB (Telegram limit).'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError('');
    setPdfFile(file);
  };

  const handleResetForm = () => {
    setBookTitle('');
    setBookCategory('');
    setOriginalSource('');
    clearPdf();
    setSubmittedSuccess(false);
    setError('');
    setNeedsBotStart(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !recommenderName.trim() ||
      !bookTitle.trim() ||
      !bookCategory.trim() ||
      (!originalSource.trim() && !pdfFile)
    ) {
      setError(
        isKm
          ? 'សូមបំពេញឈ្មោះ ឈ្មោះសៀវភៅ ប្រភេទសៀវភៅ និងប្រភពដើម ឬអាប់ឡូត PDF។'
          : 'Please enter your name, book title, category, and original source or PDF file.'
      );
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(
        isKm
          ? 'គ្មានអ៊ីនធឺណិត — សូមភ្ជាប់អ៊ីនធឺណិត រួចព្យាយាមម្ដងទៀត!'
          : 'Offline — please reconnect and try again.'
      );
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNeedsBotStart(false);

    try {
      const formData = new FormData();
      formData.append('recommenderName', recommenderName.trim());
      formData.append('bookTitle', bookTitle.trim());
      formData.append('bookCategory', bookCategory.trim());
      formData.append('originalSource', originalSource.trim());
      formData.append('studentId', currentUser?.student_id || '');

      const CHUNK_THRESHOLD = 8 * 1024 * 1024;
      if (pdfFile && pdfFile.size > CHUNK_THRESHOLD) {
        const totalChunks = Math.ceil(pdfFile.size / CHUNK_THRESHOLD);
        let chunkUploadId = '';
        for (let idx = 0; idx < totalChunks; idx++) {
          const start = idx * CHUNK_THRESHOLD;
          const end = Math.min(pdfFile.size, start + CHUNK_THRESHOLD);
          const slice = pdfFile.slice(start, end);
          const query = chunkUploadId
            ? `uploadId=${encodeURIComponent(chunkUploadId)}&chunkIndex=${idx}`
            : `chunkIndex=${idx}`;
          const chunkRes = await fetch(`/api/book_recommendation/chunk?${query}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: slice,
          });
          const chunkData = await chunkRes.json().catch(() => null);
          if (!chunkRes.ok || !chunkData?.ok || !chunkData?.uploadId) {
            throw new Error(
              chunkData?.error ||
                (isKm ? 'មានបញ្ហាក្នុងការបញ្ជូនឯកសារ PDF។' : 'Failed to upload PDF chunk.')
            );
          }
          chunkUploadId = chunkData.uploadId;
        }
        formData.append('chunkUploadId', chunkUploadId);
        formData.append('chunkFileName', pdfFile.name || 'book.pdf');
      } else if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      const response = await fetch('/api/book_recommendation', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        if (data?.needsBotStart) {
          setNeedsBotStart(true);
        }
        setError(
          data?.error ||
            (isKm
              ? 'មានបញ្ហាក្នុងការបញ្ជូនការណែនាំសៀវភៅ។ សូមព្យាយាមម្ដងទៀត!'
              : 'Failed to submit book recommendation. Please try again!')
        );
        return;
      }

      setSubmittedSuccess(true);
      setBookTitle('');
      setBookCategory('');
      setOriginalSource('');
      clearPdf();
    } catch (err) {
      setError(
        err?.message ||
          (isKm
            ? 'មានបញ្ហាក្នុងការបញ្ជូនការណែនាំសៀវភៅ។ សូមព្យាយាមម្ដងទៀត!'
            : 'Failed to submit book recommendation. Please try again!')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={isKm ? 'ណែនាំសៀវភៅបន្ថែម' : 'Recommend a Book'}
      subtitle={
        isKm
          ? 'ស្នើសុំ ឬណែនាំសៀវភៅល្អៗ និងអាប់ឡូត PDF ជូន WSD Academy'
          : 'Suggest textbooks or upload a PDF for the WSD Academy library'
      }
    >
      {submittedSuccess ? (
        <div className="space-y-5 py-2 text-center font-kh-body">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2 max-w-sm mx-auto">
            <h4 className="text-base font-bold text-white">
              {isKm ? 'បានបញ្ជូនការណែនាំរួចរាល់!' : 'Recommendation Sent!'}
            </h4>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
              {isKm
                ? 'សូមអរគុណ! ព័ត៌មាន និងឯកសារសៀវភៅរបស់អ្នកត្រូវបានបញ្ជូនទៅកាន់ Telegram របស់ក្រុមការងារ WSD Academy រួចរាល់ហើយ។'
                : 'Thank you! Your book recommendation has been forwarded to the WSD Academy admin via Telegram.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleResetForm}
              className="flex-1 py-2.5 px-4 bg-white/[0.08] hover:bg-white/15 border border-white/10 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              {isKm ? 'ណែនាំសៀវភៅផ្សេងទៀត' : 'Recommend Another'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-sm font-bold rounded-xl transition cursor-pointer"
            >
              {isKm ? 'បិទ' : 'Done'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 font-kh-body">
          {!isOnline && (
            <div className="p-3 rounded-xl bg-amber-500/12 border border-amber-400/35 text-amber-200 text-xs sm:text-sm flex items-start gap-2">
              <WifiOff className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
              <span>
                {isKm
                  ? 'កំពុងស្ថិតក្នុង Offline — មុខងារបញ្ជូនសៀវភៅទៅ Telegram ត្រូវការអ៊ីនធឺណិត។'
                  : 'You are offline — submitting book recommendations requires an internet connection.'}
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/55 text-rose-200 text-xs sm:text-sm space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {needsBotStart && (
                <a
                  href="https://t.me/wsdacademybot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#38BDF8] hover:underline ml-6"
                >
                  <span>{isKm ? 'បើក @wsdacademybot' : 'Open @wsdacademybot'}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          <Input
            id="recommend-name"
            label={isKm ? 'ឈ្មោះអ្នកណែនាំ' : 'Recommender Name'}
            placeholder={isKm ? 'បញ្ចូលឈ្មោះរបស់អ្នក' : 'Enter your name'}
            value={recommenderName}
            onChange={(e) => {
              setRecommenderName(e.target.value);
              setError('');
            }}
            leftIcon={User}
            required
          />

          <Input
            id="recommend-book-title"
            label={isKm ? 'ឈ្មោះសៀវភៅ' : 'Book Title'}
            placeholder={isKm ? 'បញ្ចូលឈ្មោះសៀវភៅ' : 'Enter book title'}
            value={bookTitle}
            onChange={(e) => {
              setBookTitle(e.target.value);
              setError('');
            }}
            leftIcon={BookOpen}
            required
          />

          <Input
            id="recommend-book-category"
            label={isKm ? 'ប្រភេទសៀវភៅ' : 'Book Category'}
            placeholder={isKm ? 'បញ្ចូលប្រភេទសៀវភៅ' : 'Enter book category'}
            value={bookCategory}
            onChange={(e) => {
              setBookCategory(e.target.value);
              setError('');
            }}
            leftIcon={Tag}
            required
          />

          <Input
            id="recommend-source"
            label={isKm ? 'ប្រភពដើម' : 'Original Source'}
            placeholder={isKm ? 'បញ្ចូលប្រភពដើម ឬតំណភ្ជាប់' : 'Enter original source or link'}
            value={originalSource}
            onChange={(e) => {
              setOriginalSource(e.target.value);
              setError('');
            }}
            leftIcon={Link2}
            required={!pdfFile}
          />

          {/* PDF Upload Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="recommend-pdf-input"
              className="block text-xs font-medium text-white/90 leading-relaxed"
            >
              {isKm ? 'អាប់ឡូតឯកសារសៀវភៅ (PDF)' : 'Upload Book File (PDF)'}
              {!originalSource.trim() && (
                <span className="text-[#38BDF8] font-bold ml-1">*</span>
              )}
            </label>

            <input
              ref={fileInputRef}
              id="recommend-pdf-input"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {pdfFile ? (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-[#38BDF8]/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-5 w-5 text-[#38BDF8] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {pdfFile.name}
                    </p>
                    <p className="text-[11px] text-white/65 tabular-nums">
                      {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB · PDF
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearPdf}
                  aria-label={isKm ? 'ដកឯកសារចេញ' : 'Remove file'}
                  className="p-1.5 rounded-lg text-white/70 hover:text-rose-300 hover:bg-white/10 transition cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="recommend-pdf-input"
                className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-white/25 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#38BDF8]/60 text-white/85 cursor-pointer transition text-xs sm:text-sm font-medium"
              >
                <FileUp className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>
                  {isKm
                    ? 'ជ្រើសរើសឯកសារ PDF (អតិបរមា 50MB)'
                    : 'Choose PDF file (max 50MB)'}
                </span>
              </label>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !isOnline}
              className="w-full inline-flex items-center justify-center font-kh-body font-bold transition-colors duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/40 disabled:opacity-60 disabled:cursor-not-allowed bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] rounded-xl text-sm sm:text-base px-5 py-2.5 gap-2 min-h-[46px]"
            >
              {isSubmitting ? (
                <>
                  <DotsLoader size="xs" color="dark" />
                  <span>{isKm ? 'កំពុងបញ្ជូន...' : 'Uploading & Sending...'}</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>{isKm ? 'បញ្ជូនការណែនាំ' : 'Submit Recommendation'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
