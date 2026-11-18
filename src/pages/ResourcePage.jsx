import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, LayoutGroup } from 'motion/react';
import {
  PenLine,
  Camera,
  Image as ImageIcon,
  Send,
  X,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ListOrdered,
  FileText,
  Eye,
  EyeOff,
  RotateCcw,
  ChevronDown,
  Bookmark,
  BookmarkCheck,
  StickyNote,
} from 'lucide-react';
import AuthRequiredBanner from '../components/auth/AuthRequiredBanner';
import SaveEssayModal from '../components/essay/SaveEssayModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  GRADE_LEVEL_GROUPS,
  ESSAY_LENGTH_OPTIONS,
  getGradeLabel,
  getEssayTypeOptionsForGrade,
  getDefaultLengthForGrade,
  getEssayLengthMetrics,
  formatOutlineToPlainText,
  formatEssayToPlainText,
} from '../data/essayPresets';
import {
  findSavedEssayByResult,
  hydrateSavedEssaysFromOfflineDB,
  saveEssayItem,
  deleteSavedEssay,
} from '../utils/savedEssays';

export default function ResourcePage() {
  const { language } = useLanguage();
  const { isAuthenticated, currentUser } = useAuth();
  const isKm = language === 'km';

  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('12');
  const [essayTypeHint, setEssayTypeHint] = useState('auto');
  const [lengthPreset, setLengthPreset] = useState('bacii_standard');
  const [customTargetType, setCustomTargetType] = useState('pages'); // 'pages' | 'words'
  const [customTargetValue, setCustomTargetValue] = useState(4);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const [resultGrade, setResultGrade] = useState('12');
  const [error, setError] = useState(null);
  const [canRetry, setCanRetry] = useState(false);

  const [activeTab, setActiveTab] = useState('outline'); // 'outline' | 'essay'
  const [showStructureTags, setShowStructureTags] = useState(true);
  const [copiedOutline, setCopiedOutline] = useState(false);
  const [copiedEssay, setCopiedEssay] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savedEntry, setSavedEntry] = useState(null);
  const [justSavedNotice, setJustSavedNotice] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    hydrateSavedEssaysFromOfflineDB(currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (!isSubmitting) {
      setElapsedSeconds(0);
      return;
    }
    setElapsedSeconds(0);
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitting]);

  useEffect(() => {
    const syncSaved = () => {
      if (result && result.is_valid_topic) {
        setSavedEntry(findSavedEssayByResult(currentUser, result, resultGrade));
      } else {
        setSavedEntry(null);
      }
    };
    syncSaved();
    window.addEventListener('wsd:saved-essays-updated', syncSaved);
    return () => window.removeEventListener('wsd:saved-essays-updated', syncSaved);
  }, [currentUser, result, resultGrade]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleGradeChange = (newGrade) => {
    setGrade(newGrade);
    if (lengthPreset !== 'custom') {
      setLengthPreset(getDefaultLengthForGrade(newGrade));
    }
    const validTypes = getEssayTypeOptionsForGrade(newGrade);
    if (!validTypes.some((opt) => opt.value === essayTypeHint)) {
      setEssayTypeHint('auto');
    }
  };

  const handleReset = () => {
    setTopic('');
    setEssayTypeHint('auto');
    clearImage();
    setError(null);
    setCanRetry(false);
    setResult(null);
    setSavedEntry(null);
    setJustSavedNotice(false);
  };

  const handleSaveWithNote = (noteText) => {
    if (!result || !result.is_valid_topic) return;
    const saved = saveEssayItem(currentUser, {
      result,
      grade: resultGrade,
      note: noteText,
      existingId: savedEntry?.id || null,
    });
    if (saved.success) {
      setSavedEntry(saved.item);
      setIsSaveModalOpen(false);
      setJustSavedNotice(true);
    }
  };

  const handleRemoveSaved = () => {
    if (!savedEntry?.id) return;
    deleteSavedEssay(currentUser, savedEntry.id);
    setSavedEntry(null);
    setJustSavedNotice(false);
    setIsSaveModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim() && !imageFile) {
      setCanRetry(false);
      setError(
        isKm
          ? 'សូមបញ្ចូលប្រធាន ឬរូបភាព។'
          : 'Please enter a topic or upload an image.'
      );
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setCanRetry(true);
      setError(
        isKm
          ? 'គ្មានអ៊ីនធឺណិត — សូមភ្ជាប់អ៊ីនធឺណិត រួចព្យាយាមម្ដងទៀត!'
          : 'Offline — please reconnect and try again.'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCanRetry(false);
    setResult(null);

    try {
      let response;
      if (imageFile) {
        const formData = new FormData();
        if (topic.trim()) formData.append('topic', topic.trim());
        formData.append('grade', grade);
        formData.append('essayTypeHint', essayTypeHint);
        formData.append('lengthPreset', lengthPreset);
        if (lengthPreset === 'custom') {
          formData.append('customTargetType', customTargetType);
          formData.append('customTargetValue', String(customTargetValue));
        }
        formData.append('image', imageFile);
        response = await fetch(`/api/essay?t=${Date.now()}`, {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch(`/api/essay?t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic.trim(),
            grade,
            essayTypeHint,
            lengthPreset,
            ...(lengthPreset === 'custom'
              ? { customTargetType, customTargetValue: Number(customTargetValue) }
              : {}),
          }),
        });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textBody = await response.text();
        throw new Error(
          `Server returned non-JSON response (${response.status}): ${textBody.substring(0, 120)}`
        );
      }

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `Server returned ${response.status}`);
      }

      setResult(data);
      setResultGrade(grade);
      setActiveTab('outline');
      setCanRetry(false);
    } catch {
      setCanRetry(true);
      setError(
        isKm
          ? 'មានបញ្ហាក្នុងការតែងសេចក្ដី សូមព្យាយាមម្ដងទៀត!'
          : 'Failed to generate essay. Please try again!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyOutline = () => {
    const textOut = formatOutlineToPlainText(result);
    if (!textOut) return;
    navigator.clipboard.writeText(textOut);
    setCopiedOutline(true);
    setTimeout(() => setCopiedOutline(false), 2500);
  };

  const handleCopyEssay = () => {
    const textOut = formatEssayToPlainText(result);
    if (!textOut) return;
    navigator.clipboard.writeText(textOut);
    setCopiedEssay(true);
    setTimeout(() => setCopiedEssay(false), 2500);
  };

  const getSectionLabel = (group) => {
    if (group === 'introduction') return isKm ? 'ផ្នែកទី ១ · សេចក្ដីផ្ដើម' : 'Part 1 · Introduction';
    if (group === 'body') return isKm ? 'ផ្នែកទី ២ · តួសេចក្ដី' : 'Part 2 · Body';
    return isKm ? 'ផ្នែកទី ៣ · សេចក្ដីបញ្ចប់' : 'Part 3 · Conclusion';
  };

  return (
    <div id="essay-page" className="space-y-6 font-kh-body pb-12">
      {!isAuthenticated ? (
        <AuthRequiredBanner featureName={isKm ? 'តែងសេចក្ដី' : 'Essay Writing'} />
      ) : (
        <div className="max-w-4xl mx-auto space-y-6 w-full min-w-0">
          {/* Page Intro Header */}
          <div className="px-1 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1 min-w-0">
              <h1 className="font-kh-title text-xl sm:text-2xl text-white tracking-wide flex items-center gap-2.5">
                <PenLine className="h-5 w-5 text-[#38BDF8] shrink-0" />
                <span>{isKm ? 'តែងសេចក្ដី' : 'Essay Writing'}</span>
              </h1>
              <p className="text-xs sm:text-sm text-white/75">
                {isKm
                  ? 'វិភាគប្រធាន និងសំណេរគំរូតាមស្ដង់ដារក្រសួងអប់រំ'
                  : 'Topic analysis and model essays per MoEYS standards'}
              </p>
            </div>

            {/* Grade Level Dropdown (3 Education Levels) */}
            <div className="relative self-start sm:self-center shrink-0">
              <label htmlFor="essay-grade-select" className="sr-only">
                {isKm ? 'កម្រិតថ្នាក់' : 'Grade Level'}
              </label>
              <select
                id="essay-grade-select"
                value={grade}
                onChange={(e) => handleGradeChange(e.target.value)}
                className="appearance-none pl-3.5 pr-9 py-2 bg-white/[0.07] hover:bg-white/12 border border-white/15 rounded-xl text-xs sm:text-sm font-medium text-white [&_option]:bg-[#194350] [&_option]:text-white [&_optgroup]:bg-[#194350] [&_optgroup]:text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 cursor-pointer transition-colors"
              >
                {GRADE_LEVEL_GROUPS.map((group) => (
                  <optgroup key={group.band} label={isKm ? group.labelKm : group.labelEn}>
                    {group.grades.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {isKm ? opt.labelKm : opt.labelEn}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-white/80 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Input Card */}
          <div className="bg-white/[0.05] rounded-2xl border border-white/10 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isKm ? 'បញ្ចូលប្រធានតែងសេចក្ដី' : 'Enter Essay Topic'}
              </h2>
              <button
                type="button"
                onClick={handleReset}
                title={isKm ? 'សម្អាត' : 'Reset'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isKm ? 'សម្អាត' : 'Clear'}</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Essay Type Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-white/75">
                  {isKm ? 'ប្រភេទតែងសេចក្ដី' : 'Essay Type'}
                </label>
                <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-xl overflow-x-auto">
                  {getEssayTypeOptionsForGrade(grade).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEssayTypeHint(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        essayTypeHint === opt.value
                          ? 'bg-white/18 text-white font-semibold'
                          : 'text-white/75 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      {isKm ? opt.labelKm : opt.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Essay Length / Page Target Selector */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-medium text-white/75">
                    {isKm ? 'កម្រិតប្រវែងសំណេរ (សន្លឹក / ពាក្យ)' : 'Target Length (Pages / Words)'}
                  </label>
                  <span className="text-xs text-white/70 tabular-nums">
                    {(() => {
                      const activeOpt = ESSAY_LENGTH_OPTIONS.find((o) => o.value === lengthPreset);
                      if (!activeOpt) return '';
                      return isKm ? activeOpt.hintKm : activeOpt.hintEn;
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-xl overflow-x-auto">
                  {ESSAY_LENGTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setLengthPreset(opt.value);
                        if (opt.value === 'custom' && customTargetValue < 1) {
                          setCustomTargetValue(customTargetType === 'pages' ? 4 : 1200);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        lengthPreset === opt.value
                          ? 'bg-white/18 text-white font-semibold'
                          : 'text-white/75 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      {isKm ? opt.labelKm : opt.labelEn}
                    </button>
                  ))}
                </div>

                {lengthPreset === 'custom' && (
                  <div className="flex flex-wrap items-center gap-3 p-3 bg-white/[0.04] rounded-xl">
                    <div className="flex items-center gap-1 p-0.5 bg-white/[0.06] rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTargetType('pages');
                          setCustomTargetValue(4);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          customTargetType === 'pages'
                            ? 'bg-white/18 text-white font-semibold'
                            : 'text-white/75 hover:text-white'
                        }`}
                      >
                        {isKm ? 'ចំនួនទំព័រ A4 / សៀវភៅ' : 'A4 / Notebook Pages'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTargetType('words');
                          setCustomTargetValue(1200);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          customTargetType === 'words'
                            ? 'bg-white/18 text-white font-semibold'
                            : 'text-white/75 hover:text-white'
                        }`}
                      >
                        {isKm ? 'ចំនួនពាក្យ' : 'Word Count'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={customTargetType === 'pages' ? 1 : 300}
                        max={customTargetType === 'pages' ? 7 : 2500}
                        step={customTargetType === 'pages' ? 0.5 : 100}
                        value={customTargetValue}
                        onChange={(e) => setCustomTargetValue(e.target.value)}
                        className="w-24 px-2.5 py-1.5 text-sm font-medium tabular-nums bg-white/[0.04] border border-white/15 rounded-lg focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 text-white"
                      />
                      <span className="text-xs text-white/80 tabular-nums">
                        {customTargetType === 'pages'
                          ? isKm
                            ? `ទំព័រ (≈ ${Math.round(Number(customTargetValue || 1) * 300)} ពាក្យ)`
                            : `pages (≈ ${Math.round(Number(customTargetValue || 1) * 300)} words)`
                          : isKm
                          ? `ពាក្យ (≈ ${(Number(customTargetValue || 300) / 300).toFixed(1)} ទំព័រ A4)`
                          : `words (≈ ${(Number(customTargetValue || 300) / 300).toFixed(1)} A4 pages)`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Topic Textarea */}
              <div>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={
                    isKm
                      ? 'វាយបញ្ចូលប្រធានតែងសេចក្ដីនៅទីនេះ...'
                      : 'Enter essay topic here...'
                  }
                  className="w-full min-h-[115px] p-3.5 bg-white/[0.04] border border-white/15 hover:border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8] transition-all resize-y text-sm sm:text-base text-white placeholder:text-white/45 leading-relaxed"
                />
              </div>

              {/* Optional Image Preview */}
              {imagePreview && (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt={isKm ? 'រូបភាពប្រធានតែងសេចក្ដី' : 'Essay topic preview'}
                    className="max-h-44 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    aria-label={isKm ? 'លុបរូបភាព' : 'Remove image'}
                    className="absolute top-2 right-2 p-1 bg-[#092731]/85 hover:bg-[#092731] text-white hover:text-rose-300 rounded-lg shadow-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action Row */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-3 border-t border-white/10">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    id="essay-camera-input"
                  />
                  <label
                    htmlFor="essay-camera-input"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.07] hover:bg-white/15 text-white rounded-xl cursor-pointer transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    <Camera className="w-4 h-4 text-white" />
                    <span>{isKm ? 'ថតរូបប្រធាន' : 'Camera'}</span>
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    id="essay-image-input"
                  />
                  <label
                    htmlFor="essay-image-input"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.07] hover:bg-white/15 text-white rounded-xl cursor-pointer transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    <ImageIcon className="w-4 h-4 text-white" />
                    <span>{isKm ? 'រូបភាពពីម៉ាស៊ីន' : 'Gallery'}</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (!topic.trim() && !imageFile)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#38BDF8] hover:bg-[#56CAF9] disabled:opacity-50 disabled:cursor-not-allowed text-[#092731] rounded-xl cursor-pointer transition-colors shadow-xs text-sm font-bold whitespace-nowrap shrink-0 tabular-nums"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {isKm
                          ? `កំពុងដំណើរការ (${elapsedSeconds}វិ)`
                          : `Generating (${elapsedSeconds}s)`}
                      </span>
                    </>
                  ) : canRetry ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>{isKm ? 'ព្យាយាមម្ដងទៀត' : 'Try Again'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{isKm ? 'វិភាគ និងបង្កើតគម្រោង' : 'Analyze & Generate'}</span>
                    </>
                  )}
                </button>
              </div>

              {isSubmitting && (() => {
                const stageLabel =
                  elapsedSeconds < 4
                    ? isKm
                      ? '១/៤ · កំពុងអាន និងវិភាគប្រធាន...'
                      : '1/4 · Reading & analyzing prompt...'
                    : elapsedSeconds < 10
                    ? isKm
                      ? '២/៤ · កំពុងរៀបចំគម្រោងតែង ៣ ផ្នែក...'
                      : '2/4 · Building 3-part outline...'
                    : elapsedSeconds < 23
                    ? isKm
                      ? '៣/៤ · កំពុងសរសេរសំណេរគំរូពេញលេញ...'
                      : '3/4 · Writing full model essay...'
                    : isKm
                    ? '៤/៤ · កំពុងផ្ទៀងផ្ទាត់ខ្លឹមសារ និងចំនួនពាក្យ...'
                    : '4/4 · Verifying structure & length...';

                const progressPct = Math.min(
                  94,
                  Math.round(14 + (1 - Math.exp(-elapsedSeconds / 14)) * 80)
                );

                return (
                  <div
                    role="status"
                    aria-live="polite"
                    className="bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 font-medium text-white">
                        <Loader2 className="w-3.5 h-3.5 text-[#38BDF8] animate-spin shrink-0" />
                        <span>{stageLabel}</span>
                      </span>
                      <span className="text-white/75 tabular-nums shrink-0">
                        {isKm ? `${elapsedSeconds} វិនាទី` : `${elapsedSeconds}s`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/12 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#38BDF8] rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {error && (
                <div className="p-3.5 bg-rose-500/15 border border-rose-400/55 text-rose-200 text-xs sm:text-sm rounded-lg flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </form>
          </div>

          {/* Results Workspace */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 w-full min-w-0"
            >
              {!result.is_valid_topic ? (
                <div className="bg-white/[0.05] border border-white/10 p-5 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">
                        {isKm ? 'មិនមែនជាប្រធានតែងសេចក្ដី' : 'Invalid Essay Topic'}
                      </p>
                      <p className="text-sm text-white/85 leading-relaxed">
                        {result.rejection_reason ||
                          (isKm
                            ? 'សូមបញ្ចូលប្រធានតែងសេចក្ដី ឬថតរូបប្រធានដែលអ្នកចង់សិក្សា។'
                            : 'Please enter a valid essay topic.')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Topic Summary & Classification Bar */}
                  {(() => {
                    const metrics = getEssayLengthMetrics(result);
                    return (
                      <div className="bg-white/[0.05] rounded-2xl border border-white/10 p-5 sm:p-6 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-white/75 tabular-nums pt-1">
                            <span className="font-semibold text-white">
                              {result.essay_type_label}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{getGradeLabel(resultGrade, isKm)}</span>
                            {metrics.wordCount > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {isKm
                                    ? `ប្រវែង ${metrics.wordCount.toLocaleString()} ពាក្យ`
                                    : `${metrics.wordCount.toLocaleString()} words`}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {isKm
                                    ? `ប៉ាន់ស្មាន ~${metrics.estimatedPages} ទំព័រសរសេរដៃ A4`
                                    : `~${metrics.estimatedPages} handwritten A4 pages`}
                                </span>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            id="essay-save-bookmark-btn"
                            onClick={() => setIsSaveModalOpen(true)}
                            title={
                              savedEntry
                                ? isKm
                                  ? 'កែប្រែកំណត់ចំណាំ ឬមើលការរក្សាទុក'
                                  : 'Edit saved note'
                                : isKm
                                ? 'រក្សាទុក និងសរសេរកំណត់ចំណាំ'
                                : 'Save essay with note'
                            }
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              savedEntry
                                ? 'bg-[#38BDF8] text-[#092731] hover:bg-[#56CAF9]'
                                : 'bg-white/[0.08] hover:bg-white/15 text-white'
                            }`}
                          >
                            {savedEntry ? (
                              <>
                                <BookmarkCheck className="w-4 h-4 shrink-0" />
                                <span>{isKm ? 'បានរក្សាទុក' : 'Saved'}</span>
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-4 h-4 shrink-0" />
                                <span>{isKm ? 'រក្សាទុក' : 'Save'}</span>
                              </>
                            )}
                          </button>
                        </div>

                        <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                          {result.detected_topic}
                        </h2>

                        {(savedEntry || justSavedNotice) && (
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-white/[0.06] rounded-xl text-xs">
                            <div className="flex items-start gap-2 min-w-0">
                              <StickyNote className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
                              <div className="text-white leading-relaxed">
                                {savedEntry?.note ? (
                                  <>
                                    <span className="font-semibold text-white">
                                      {isKm ? 'កំណត់ចំណាំ៖ ' : 'Note: '}
                                    </span>
                                    <span>{savedEntry.note}</span>
                                  </>
                                ) : (
                                  <span className="text-white/80">
                                    {isKm ? 'បានរក្សាទុក' : 'Saved'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                type="button"
                                onClick={() => setIsSaveModalOpen(true)}
                                className="font-medium text-white/80 hover:text-white hover:underline cursor-pointer whitespace-nowrap"
                              >
                                {savedEntry?.note
                                  ? isKm
                                    ? 'កែប្រែ'
                                    : 'Edit'
                                  : isKm
                                  ? '+ កំណត់ចំណាំ'
                                  : '+ Note'}
                              </button>
                              <Link
                                to="/profile?view=bookmark"
                                className="font-semibold text-[#38BDF8] hover:underline whitespace-nowrap"
                              >
                                {isKm ? 'មើលក្នុង រក្សាទុក' : 'Open Saved'}
                              </Link>
                            </div>
                          </div>
                        )}

                    <p className="text-xs sm:text-sm text-white/85 leading-relaxed pt-3 border-t border-white/10">
                      <span className="font-semibold text-white">
                        {isKm ? 'ការសម្គាល់ប្រភេទប្រធាន៖ ' : 'Classification Reasoning: '}
                      </span>
                      {result.type_reasoning}
                    </p>

                    {result.server_verification?.checks && (
                      <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white">
                        {[
                          {
                            ok: result.server_verification.checks.has_intro,
                            km: 'សេចក្ដីផ្ដើមពេញលេញ',
                            en: 'Complete Intro',
                          },
                          {
                            ok: result.server_verification.checks.has_keywords,
                            km: 'ពាក្យគន្លឹះ & ន័យប្រធាន',
                            en: 'Keywords & Meaning',
                          },
                          {
                            ok:
                              result.server_verification.checks.has_main_analysis &&
                              result.server_verification.checks.has_counter_and_synthesis,
                              km:
                                result.essay_type_code === 'discussion'
                                  ? 'មតិស្រប · មតិផ្ទុយ · សំយោគ'
                                  : result.essay_type_code === 'comparative'
                                  ? 'ចំណុចដូច · ខុស · សំយោគ'
                                  : result.essay_type_code === 'descriptive'
                                  ? 'ការពណ៌នាលម្អិតតាមលំដាប់'
                                  : result.essay_type_code === 'narrative'
                                  ? 'ដំណើររឿង និងព្រឹត្តិការណ៍'
                                  : 'បំណកស្រាយគ្រប់ជ្រុងជ្រោយ',
                              en: 'Full Analysis Pillars',
                            },
                            {
                              ok: result.server_verification.checks.has_examples,
                              km:
                                result.essay_type_code === 'descriptive' ||
                                result.essay_type_code === 'narrative'
                                  ? 'រូបភាព & ឧទាហរណ៍ជាក់ស្ដែង'
                                  : 'ឧទាហរណ៍អក្សរសិល្ប៍ & សង្គម',
                              en: 'Supporting Examples',
                            },
                          {
                            ok: result.server_verification.checks.has_conclusion,
                            km: 'សេចក្ដីបញ្ចប់ & ទស្សនៈផ្ទាល់ខ្លួន',
                            en: 'Conclusion & Personal View',
                          },
                        ].map((item, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 ${
                              item.ok ? 'text-emerald-300' : 'text-[#38BDF8]'
                            }`}
                          >
                            {item.ok ? (
                              <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                            )}
                            <span>{isKm ? item.km : item.en}</span>
                          </span>
                        ))}
                      </div>
                    )}
                      </div>
                    );
                  })()}

                  {/* Mode Switcher Tabs + Copy Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <LayoutGroup id="essay-result-tabs">
                      <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-xl self-start">
                        <button
                          type="button"
                          onClick={() => setActiveTab('outline')}
                          className={`relative flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                            activeTab === 'outline'
                              ? 'text-white font-semibold'
                              : 'text-white/75 hover:text-white hover:bg-white/[0.06]'
                          }`}
                        >
                          {activeTab === 'outline' && (
                            <motion.span
                              layoutId="essay-tab-pill"
                              transition={{
                                type: 'spring',
                                stiffness: 340,
                                damping: 30,
                                mass: 0.75,
                              }}
                              className="absolute inset-0 rounded-lg bg-white/18"
                            />
                          )}
                          <ListOrdered className="relative z-10 w-4 h-4" />
                          <span className="relative z-10">{isKm ? 'គម្រោងតែង និងវិភាគប្រធាន' : 'Outline & Analysis'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('essay')}
                          className={`relative flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                            activeTab === 'essay'
                              ? 'text-white font-semibold'
                              : 'text-white/75 hover:text-white hover:bg-white/[0.06]'
                          }`}
                        >
                          {activeTab === 'essay' && (
                            <motion.span
                              layoutId="essay-tab-pill"
                              transition={{
                                type: 'spring',
                                stiffness: 340,
                                damping: 30,
                                mass: 0.75,
                              }}
                              className="absolute inset-0 rounded-lg bg-white/18"
                            />
                          )}
                          <FileText className="relative z-10 w-4 h-4" />
                          <span className="relative z-10">{isKm ? 'សំណេរគំរូពេញលេញ' : 'Full Model Essay'}</span>
                        </button>
                      </div>
                    </LayoutGroup>

                    {activeTab === 'outline' ? (
                      <button
                        type="button"
                        onClick={handleCopyOutline}
                        className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-colors self-start sm:self-center whitespace-nowrap shrink-0 cursor-pointer ${
                          copiedOutline
                            ? 'bg-[#38BDF8] text-[#092731] font-semibold'
                            : 'bg-white/[0.08] hover:bg-white/15 text-white'
                        }`}
                      >
                        {copiedOutline ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{isKm ? 'បានចម្លងគម្រោង!' : 'Outline Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{isKm ? 'ចម្លងគម្រោងតែង' : 'Copy Outline'}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => setShowStructureTags((prev) => !prev)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {showStructureTags ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-white" />
                              <span>{isKm ? 'លាក់ស្លាកផ្នែក' : 'Hide Tags'}</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-white" />
                              <span>{isKm ? 'បង្ហាញស្លាកផ្នែក' : 'Show Tags'}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyEssay}
                          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            copiedEssay
                              ? 'bg-[#38BDF8] text-[#092731] font-semibold'
                              : 'bg-white/[0.08] hover:bg-white/15 text-white'
                          }`}
                        >
                          {copiedEssay ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{isKm ? 'បានចម្លងសំណេរ!' : 'Essay Copied!'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{isKm ? 'ចម្លងសំណេរស្អាត' : 'Copy Clean Essay'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* TAB 1: Outline & Analysis */}
                  {activeTab === 'outline' && (
                    <div className="bg-white/[0.05] rounded-2xl border border-white/10 p-5 sm:p-8 space-y-8">
                      {/* Keywords & Topic Meaning */}
                      <section className="space-y-4">
                        <h3 className="font-kh-title text-lg text-white">
                          {isKm ? '០១. ពន្យល់ពាក្យគន្លឹះ និងន័យប្រធាន' : '01. Key Terms & Prompt Meaning'}
                        </h3>

                        {result.keywords && result.keywords.length > 0 && (
                          <div className="divide-y divide-white/10 border-t border-b border-white/10">
                            {result.keywords.map((item, idx) => (
                              <div key={idx} className="py-3 grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-4">
                                <dt className="text-sm font-bold text-white sm:col-span-1">
                                  {item.word}
                                </dt>
                                <dd className="text-sm text-white/85 leading-relaxed sm:col-span-3">
                                  {item.explanation}
                                </dd>
                              </div>
                            ))}
                          </div>
                        )}

                        {result.topic_meaning && (
                          <div className="pt-2">
                            <p className="text-xs font-semibold text-white/75 mb-1">
                              {isKm ? 'ន័យរួមរបស់ប្រធាន' : 'Overall Prompt Meaning'}
                            </p>
                            <p className="text-sm sm:text-base text-white leading-relaxed">
                              {result.topic_meaning}
                            </p>
                          </div>
                        )}
                      </section>

                      <hr className="border-white/10" />

                      {/* Part 1: Introduction */}
                      <section className="space-y-4">
                        <h3 className="font-kh-title text-lg text-white">
                          {isKm ? '០២. សេចក្ដីផ្ដើម' : '02. Introduction'}
                        </h3>
                        <div className="space-y-4 text-sm text-white/90 leading-relaxed">
                          <div>
                            <p className="text-xs font-semibold text-white/75 mb-1">
                              {isKm ? 'ក. លំនាំបញ្ហា' : 'a. Lead-in Context'}
                            </p>
                            <p>{result.outline?.introduction?.lead_in}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white/75 mb-1">
                              {isKm ? 'ខ. ចំណូលបញ្ហា' : 'b. Topic Introduction'}
                            </p>
                            <p>{result.outline?.introduction?.topic_introduction}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white/75 mb-1.5">
                              {isKm ? 'គ. ចំណោទបញ្ហា' : 'c. Problem Questions'}
                            </p>
                            <ul className="space-y-1.5 list-disc list-inside text-white">
                              {(result.outline?.introduction?.problem_questions || []).map((q, i) => (
                                <li key={i}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </section>

                      <hr className="border-white/10" />

                      {/* Part 2: Body */}
                      <section className="space-y-5">
                        <h3 className="font-kh-title text-lg text-white">
                          {isKm ? '០៣. តួសេចក្ដី' : '03. Body'}
                        </h3>
                        <div className="space-y-4 text-sm text-white/90 leading-relaxed">
                          <div>
                            <p className="text-xs font-semibold text-white/75 mb-1">
                              {isKm ? 'ឃ្លាភ្ជាប់សេចក្ដី' : 'Transition Phrase'}
                            </p>
                            <p className="italic text-white">
                              {result.outline?.body?.transition_phrase}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-white/75 mb-1">
                              {result.essay_type_code === 'discussion'
                                ? isKm
                                  ? 'ក. បំណកស្រាយមតិស្រប'
                                  : 'a. Supporting Thesis'
                                : result.essay_type_code === 'comparative'
                                ? isKm
                                  ? 'ក. ចំណុចដូចគ្នា'
                                  : 'a. Similarities'
                                : result.essay_type_code === 'descriptive'
                                ? isKm
                                  ? 'ក. ការរៀបរាប់ពណ៌នាលម្អិត'
                                  : 'a. Detailed Description'
                                : result.essay_type_code === 'narrative'
                                ? isKm
                                  ? 'ក. ដំណើររឿង និងព្រឹត្តិការណ៍'
                                  : 'a. Story Progression & Events'
                                : isKm
                                ? 'ក. បំណកស្រាយខ្លឹមសារប្រធាន'
                                : 'a. Main Analysis'}
                            </p>
                            <p>{result.outline?.body?.thesis_explanation}</p>
                          </div>

                          {result.outline?.body?.counter_argument && (
                            <div>
                              <p className="text-xs font-semibold text-white/75 mb-1">
                                {result.essay_type_code === 'comparative'
                                  ? isKm
                                    ? 'ខ. ចំណុចខុសគ្នា'
                                    : 'b. Differences'
                                  : isKm
                                  ? 'ខ. បំណកស្រាយមតិផ្ទុយ'
                                  : 'b. Counter-Argument'}
                              </p>
                              <p>{result.outline.body.counter_argument}</p>
                            </div>
                          )}

                          {result.outline?.body?.synthesis && (
                            <div>
                              <p className="text-xs font-semibold text-white/75 mb-1">
                                {isKm ? 'គ. មតិសំយោគ' : 'c. Balanced Synthesis'}
                              </p>
                              <p>{result.outline.body.synthesis}</p>
                            </div>
                          )}

                          {/* Literary Examples */}
                          {result.outline?.body?.literary_examples?.length > 0 && (
                            <div className="pt-2 space-y-3">
                              <p className="text-xs font-semibold text-white/75">
                                {isKm ? 'ឧទាហរណ៍ក្នុងអក្សរសិល្ប៍ខ្មែរ' : 'Khmer Literature Examples'}
                              </p>
                              <div className="divide-y divide-white/10 border-t border-b border-white/10">
                                {result.outline.body.literary_examples.map((ex, i) => (
                                  <div key={i} className="py-3 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/75">
                                      <span className="font-bold text-white text-sm">
                                        {ex.work_title}
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span>{ex.author}</span>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-white font-medium">
                                        {ex.character_or_event}
                                      </span>
                                    </div>
                                    <p className="text-sm text-white/90 leading-relaxed">
                                      {ex.connection}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Social Examples */}
                          {result.outline?.body?.social_examples?.length > 0 && (
                            <div className="pt-1 space-y-2">
                              <p className="text-xs font-semibold text-white/75">
                                {isKm ? 'ឧទាហរណ៍ក្នុងសង្គមជាក់ស្ដែង' : 'Real Social Examples'}
                              </p>
                              <ul className="space-y-1.5 list-disc list-inside text-white/90">
                                {result.outline.body.social_examples.map((ex, i) => (
                                  <li key={i}>{ex}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-semibold text-white/75 mb-1">
                              {isKm ? 'សន្និដ្ឋានរួមតាមតួសេចក្ដី' : 'Body Summary'}
                            </p>
                            <p>{result.outline?.body?.body_conclusion}</p>
                          </div>
                        </div>
                      </section>

                      <hr className="border-white/10" />

                      {/* Part 3: Conclusion */}
                      <section className="space-y-4">
                        <h3 className="font-kh-title text-lg text-white">
                          {isKm ? '០៤. សេចក្ដីបញ្ចប់' : '04. Conclusion'}
                        </h3>
                        <div className="space-y-4 text-sm text-white/90 leading-relaxed">
                          <div>
                            <p className="text-xs font-semibold text-white/75 mb-1">
                              {isKm ? 'ក. វាយតម្លៃប្រធាន' : 'a. Final Evaluation'}
                            </p>
                            <p>{result.outline?.conclusion?.evaluation}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white/75 mb-1">
                              {isKm ? 'ខ. ទស្សនៈផ្ទាល់ខ្លួន និងការប្ដេជ្ញាចិត្ត' : 'b. Personal Stance & Action'}
                            </p>
                            <p>{result.outline?.conclusion?.personal_view}</p>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {/* TAB 2: Full Annotated / Clean Model Essay */}
                  {activeTab === 'essay' && (
                    <article className="bg-white/[0.05] rounded-2xl border border-white/10 p-5 sm:p-10">
                      <div className="max-w-3xl mx-auto space-y-6 font-kh-content">
                        {(result.annotated_essay || []).map((segment, idx, arr) => {
                          const prevGroup = idx > 0 ? arr[idx - 1].section_group : null;
                          const isNewGroup = segment.section_group !== prevGroup;

                          return (
                            <div key={idx} className="space-y-2">
                              {showStructureTags && isNewGroup && (
                                <div
                                  className={`${
                                    idx > 0 ? 'pt-6 mt-6 border-t border-white/10' : ''
                                  } text-xs font-bold text-[#38BDF8] tracking-wide`}
                                >
                                  {getSectionLabel(segment.section_group)}
                                </div>
                              )}

                              {showStructureTags && (
                                <div className="text-xs text-white/70 font-medium">
                                  <span>{String(idx + 1).padStart(2, '0')}</span>
                                  <span className="mx-1.5" aria-hidden="true">/</span>
                                  <span className="text-white">{segment.tag_label}</span>
                                </div>
                              )}

                              <p className="text-sm sm:text-base text-white/95 leading-[1.9] indent-8 text-justify">
                                {segment.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  )}
                </>
              )}
            </motion.div>
          )}
          {/* Save Essay with Personal Note Modal */}
          <SaveEssayModal
            isOpen={isSaveModalOpen}
            onClose={() => setIsSaveModalOpen(false)}
            onSave={handleSaveWithNote}
            onRemove={handleRemoveSaved}
            result={result}
            grade={resultGrade}
            existingSavedItem={savedEntry}
            isKm={isKm}
          />
        </div>
      )}
    </div>
  );
}
