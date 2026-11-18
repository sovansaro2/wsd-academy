import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, BookmarkCheck, X, Trash2 } from 'lucide-react';
import { getGradeLabel } from '../../data/essayPresets';

export default function SaveEssayModal({
  isOpen,
  onClose,
  onSave,
  onRemove,
  result,
  grade,
  existingSavedItem,
  isKm,
}) {
  const [note, setNote] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setNote(existingSavedItem?.note || '');
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen, existingSavedItem]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !result) return null;

  const isEditingExisting = Boolean(existingSavedItem);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(note);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 font-kh-body"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-essay-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-[#194350] border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            {isEditingExisting ? (
              <BookmarkCheck className="w-5 h-5 text-[#38BDF8] shrink-0" />
            ) : (
              <Bookmark className="w-5 h-5 text-[#38BDF8] shrink-0" />
            )}
            <h3
              id="save-essay-modal-title"
              className="font-kh-title text-base sm:text-lg text-white truncate"
            >
              {isEditingExisting
                ? isKm
                  ? 'កែប្រែកំណត់ចំណាំ'
                  : 'Edit Note'
                : isKm
                ? 'រក្សាទុកតែងសេចក្ដី'
                : 'Save Essay'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isKm ? 'បិទ' : 'Close'}
            className="p-2 -mr-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-white/[0.06] rounded-xl p-3.5 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/75 tabular-nums">
              <span className="font-semibold text-white">
                {result.essay_type_label}
              </span>
              <span aria-hidden="true">·</span>
              <span>{getGradeLabel(grade, isKm)}</span>
            </div>
            <p className="text-sm font-medium text-white line-clamp-2 leading-relaxed">
              {result.detected_topic}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="essay-save-note-input"
                className="block text-xs font-semibold text-white"
              >
                {isKm ? 'កំណត់ចំណាំ' : 'Note'}
              </label>
              <span className="text-xs text-white/60 tabular-nums">
                {note.length}/500
              </span>
            </div>
            <textarea
              ref={textareaRef}
              id="essay-save-note-input"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={
                isKm ? 'សរសេរកំណត់ចំណាំ (ស្រេចចិត្ត)...' : 'Add a note (optional)...'
              }
              className="w-full p-3 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/25 focus:border-[#38BDF8] resize-y leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            {isEditingExisting && onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKm ? 'ដកចេញ' : 'Remove'}</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-white/[0.07] hover:bg-white/15 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {isKm ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>{isKm ? 'រក្សាទុក' : 'Save'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
