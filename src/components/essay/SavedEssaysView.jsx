import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Search,
  Pencil,
  Trash2,
  ListOrdered,
  FileText,
  Copy,
  Check,
  Eye,
  EyeOff,
  BookOpen,
  PenLine,
  StickyNote,
  WifiOff,
} from 'lucide-react';
import {
  getGradeLabel,
  getEssayLengthMetrics,
  formatOutlineToPlainText,
  formatEssayToPlainText,
} from '../../data/essayPresets';
import {
  getSavedEssays,
  hydrateSavedEssaysFromOfflineDB,
  updateSavedEssayNote,
  deleteSavedEssay,
} from '../../utils/savedEssays';
import { useOnlineStatus } from '../../hooks/usePWA';

export default function SavedEssaysView({ currentUser, isKm, onBack }) {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [items, setItems] = useState(() => getSavedEssays(currentUser));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  const [activeTab, setActiveTab] = useState('outline');
  const [showStructureTags, setShowStructureTags] = useState(true);
  const [copiedOutline, setCopiedOutline] = useState(false);
  const [copiedEssay, setCopiedEssay] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const sync = () => setItems(getSavedEssays(currentUser));
    sync();
    hydrateSavedEssaysFromOfflineDB(currentUser).then((merged) => {
      if (Array.isArray(merged)) setItems(merged);
    });
    window.addEventListener('wsd:saved-essays-updated', sync);
    return () => window.removeEventListener('wsd:saved-essays-updated', sync);
  }, [currentUser]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const topic = (item.essay?.detected_topic || '').toLowerCase();
      const note = (item.note || '').toLowerCase();
      const typeLabel = (item.essay?.essay_type_label || '').toLowerCase();
      const gradeLabel = getGradeLabel(item.grade, isKm).toLowerCase();
      return (
        topic.includes(q) ||
        note.includes(q) ||
        typeLabel.includes(q) ||
        gradeLabel.includes(q)
      );
    });
  }, [items, searchQuery, isKm]);

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) || null,
    [items, selectedId]
  );

  const formatSavedDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleDateString(isKm ? 'km-KH' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const startEditNote = (item) => {
    setEditingNoteId(item.id);
    setNoteDraft(item.note || '');
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setNoteDraft('');
  };

  const handleSaveNote = (id) => {
    const res = updateSavedEssayNote(currentUser, id, noteDraft);
    if (res.success) {
      setItems(getSavedEssays(currentUser));
      setEditingNoteId(null);
      setNoteDraft('');
    }
  };

  const handleDelete = (id) => {
    const res = deleteSavedEssay(currentUser, id);
    if (res.success) {
      setItems(res.list);
      if (selectedId === id) setSelectedId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleCopyOutline = () => {
    if (!selectedItem?.essay) return;
    const textOut = formatOutlineToPlainText(selectedItem.essay);
    if (!textOut) return;
    navigator.clipboard.writeText(textOut);
    setCopiedOutline(true);
    setTimeout(() => setCopiedOutline(false), 2500);
  };

  const handleCopyEssay = () => {
    if (!selectedItem?.essay) return;
    const textOut = formatEssayToPlainText(selectedItem.essay);
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

  // DETAIL VIEW
  if (selectedItem) {
    const result = selectedItem.essay;
    const metrics = getEssayLengthMetrics(result);

    return (
      <div id="bookmark-detail-subpage" className="max-w-4xl mx-auto space-y-5 font-kh-body pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setEditingNoteId(null);
            }}
            className="inline-flex items-center gap-2 text-white hover:underline font-semibold text-sm transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isKm ? 'ត្រឡប់ក្រោយ' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-xs text-[#38BDF8] font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirmDeleteId === selectedItem.id) {
                  handleDelete(selectedItem.id);
                } else {
                  setConfirmDeleteId(selectedItem.id);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                confirmDeleteId === selectedItem.id
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/[0.07] text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {confirmDeleteId === selectedItem.id
                  ? isKm
                    ? 'បញ្ជាក់លុប'
                    : 'Confirm'
                  : isKm
                  ? 'លុប'
                  : 'Delete'}
              </span>
            </button>
          </div>
        </div>

        {/* Summary & Note */}
        <div className="bg-white/[0.05] rounded-2xl border border-white/10 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/75 tabular-nums">
            <span className="font-semibold text-white">{result.essay_type_label}</span>
            <span aria-hidden="true">·</span>
            <span>{getGradeLabel(selectedItem.grade, isKm)}</span>
            {metrics.wordCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {isKm ? `${metrics.wordCount.toLocaleString()} ពាក្យ` : `${metrics.wordCount.toLocaleString()} words`}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {isKm ? `~${metrics.estimatedPages} ទំព័រ A4` : `~${metrics.estimatedPages} A4`}
                </span>
              </>
            )}
            {selectedItem.savedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatSavedDate(selectedItem.savedAt)}</span>
              </>
            )}
          </div>

          <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
            {result.detected_topic}
          </h2>

          {/* Concise Note Block */}
          <div className="pt-3 border-t border-white/10">
            {editingNoteId === selectedItem.id ? (
              <div className="space-y-2.5 bg-white/[0.05] rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    {isKm ? 'កំណត់ចំណាំ' : 'Note'}
                  </span>
                  <span className="text-xs text-white/65 tabular-nums">
                    {noteDraft.length}/500
                  </span>
                </div>
                <textarea
                  value={noteDraft}
                  maxLength={500}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={3}
                  placeholder={isKm ? 'សរសេរកំណត់ចំណាំ...' : 'Write a note...'}
                  className="w-full p-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8] resize-y"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelEditNote}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-white/[0.07] hover:bg-white/15 rounded-lg cursor-pointer"
                  >
                    {isKm ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveNote(selectedItem.id)}
                    className="px-3.5 py-1.5 text-xs font-bold bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] rounded-lg cursor-pointer"
                  >
                    {isKm ? 'រក្សាទុក' : 'Save'}
                  </button>
                </div>
              </div>
            ) : selectedItem.note ? (
              <div className="flex items-start justify-between gap-3 bg-white/[0.06] rounded-xl p-3">
                <div className="flex items-start gap-2 min-w-0">
                  <StickyNote className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-white/95 leading-relaxed whitespace-pre-wrap">
                    {selectedItem.note}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEditNote(selectedItem)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-white/[0.08] hover:bg-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>{isKm ? 'កែប្រែ' : 'Edit'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startEditNote(selectedItem)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white/75 hover:text-white transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{isKm ? 'បន្ថែមកំណត់ចំណាំ' : 'Add note'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Switcher Tabs + Copy Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveTab('outline')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'outline'
                  ? 'bg-white/18 text-white font-semibold'
                  : 'text-white/75 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>{isKm ? 'គម្រោងតែង' : 'Outline'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('essay')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'essay'
                  ? 'bg-white/18 text-white font-semibold'
                  : 'text-white/75 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{isKm ? 'សំណេរគំរូ' : 'Model Essay'}</span>
            </button>
          </div>

          {activeTab === 'outline' ? (
            <button
              type="button"
              onClick={handleCopyOutline}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-colors self-start sm:self-center whitespace-nowrap shrink-0 cursor-pointer ${
                copiedOutline
                  ? 'bg-[#38BDF8] text-[#092731] font-semibold'
                  : 'bg-white/[0.08] text-white hover:bg-white/15'
              }`}
            >
              {copiedOutline ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isKm ? 'បានចម្លង!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ចម្លងគម្រោង' : 'Copy Outline'}</span>
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
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{isKm ? 'លាក់ស្លាក' : 'Hide Tags'}</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isKm ? 'បង្ហាញស្លាក' : 'Show Tags'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCopyEssay}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  copiedEssay
                    ? 'bg-[#38BDF8] text-[#092731] font-semibold'
                    : 'bg-white/[0.08] text-white hover:bg-white/15'
                }`}
              >
                {copiedEssay ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isKm ? 'បានចម្លង!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isKm ? 'ចម្លងសំណេរ' : 'Copy Essay'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: Outline */}
        {activeTab === 'outline' && (
          <div className="bg-white/[0.05] rounded-2xl border border-white/10 p-5 sm:p-8 space-y-8 text-white">
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
                  <ul className="space-y-1.5 list-disc list-inside text-white/90">
                    {(result.outline?.introduction?.problem_questions || []).map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <hr className="border-white/10" />

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

        {/* TAB 2: Full Model Essay */}
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
      </div>
    );
  }

  // SAVED ESSAYS LIST VIEW
  return (
    <div id="bookmark-subpage" className="max-w-3xl mx-auto space-y-5 font-kh-body pb-10">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-white hover:underline font-semibold text-sm transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{isKm ? 'ត្រឡប់ក្រោយ' : 'Back'}</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-white/75 tabular-nums">
          {!isOnline && (
            <span className="inline-flex items-center gap-1 text-[#38BDF8] font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline</span>
            </span>
          )}
          <span>{isKm ? `${items.length} អត្ថបទ` : `${items.length} saved`}</span>
        </div>
      </div>

      {/* Header & Search */}
      <div className="bg-white/[0.05] rounded-2xl border border-white/10 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-kh-title text-lg sm:text-xl text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#38BDF8]" />
            <span>{isKm ? 'រក្សាទុក' : 'Saved'}</span>
          </h2>

          <button
            type="button"
            onClick={() => navigate('/resource')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>{isKm ? 'តែងសេចក្ដី' : 'Write Essay'}</span>
          </button>
        </div>

        {items.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKm ? 'ស្វែងរក...' : 'Search...'}
              className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8]"
            />
          </div>
        )}
      </div>

      {/* Empty State vs List */}
      {items.length === 0 ? (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-10 text-center space-y-4">
          <Bookmark className="w-8 h-8 text-[#38BDF8] mx-auto" />
          <p className="text-sm text-white/75">
            {isKm ? 'មិនទាន់មានទិន្នន័យរក្សាទុក' : 'No saved essays yet'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/resource')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            <PenLine className="w-4 h-4" />
            <span>{isKm ? 'ទៅតែងសេចក្ដី' : 'Go to Essays'}</span>
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-8 text-center text-sm text-white/75">
          {isKm ? 'រកមិនឃើញលទ្ធផល' : 'No matching results'}
        </div>
      ) : (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl divide-y divide-white/10">
          {filteredItems.map((item) => {
            const metrics = getEssayLengthMetrics(item.essay);
            const wordCount = item.wordCount || metrics.wordCount;
            const isEditingThis = editingNoteId === item.id;
            const isConfirmingDelete = confirmDeleteId === item.id;

            return (
              <div key={item.id} className="p-4 sm:p-5 space-y-3 transition-colors">
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/75 tabular-nums">
                  <span className="font-semibold text-white">
                    {item.essay?.essay_type_label}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{getGradeLabel(item.grade, isKm)}</span>
                  {wordCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {isKm ? `${wordCount.toLocaleString()} ពាក្យ` : `${wordCount.toLocaleString()} words`}
                      </span>
                    </>
                  )}
                  {item.savedAt && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{formatSavedDate(item.savedAt)}</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setActiveTab('outline');
                    setConfirmDeleteId(null);
                  }}
                  className="text-left block w-full group cursor-pointer"
                >
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:underline transition-colors leading-relaxed">
                    {item.essay?.detected_topic}
                  </h3>
                </button>

                {isEditingThis ? (
                  <div className="space-y-2 bg-white/[0.05] rounded-xl p-3">
                    <textarea
                      value={noteDraft}
                      maxLength={500}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={2}
                      placeholder={isKm ? 'សរសេរកំណត់ចំណាំ...' : 'Write a note...'}
                      className="w-full p-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8] resize-y"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditNote}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-white/[0.07] hover:bg-white/15 rounded-lg cursor-pointer"
                      >
                        {isKm ? 'បោះបង់' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveNote(item.id)}
                        className="px-3.5 py-1.5 text-xs font-bold bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] rounded-lg cursor-pointer"
                      >
                        {isKm ? 'រក្សាទុក' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  item.note && (
                    <div className="bg-white/[0.06] rounded-xl px-3 py-2 flex items-start gap-2">
                      <StickyNote className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-white/95 leading-relaxed whitespace-pre-wrap">
                        {item.note}
                      </p>
                    </div>
                  )
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        setActiveTab('outline');
                        setConfirmDeleteId(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#092731] bg-[#38BDF8] hover:bg-[#56CAF9] rounded-xl transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{isKm ? 'បើកមើល' : 'Open'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditNote(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-white/[0.08] hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{isKm ? 'កំណត់ចំណាំ' : 'Note'}</span>
                    </button>
                  </div>

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 text-xs font-medium text-white bg-white/[0.08] hover:bg-white/15 rounded-xl cursor-pointer"
                      >
                        {isKm ? 'ទេ' : 'No'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer"
                      >
                        {isKm ? 'បញ្ជាក់' : 'Confirm'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      aria-label={isKm ? 'លុប' : 'Delete'}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white/75 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isKm ? 'លុប' : 'Delete'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
