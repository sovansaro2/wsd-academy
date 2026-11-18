import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../context/LanguageContext';

const MONTHS_KM = [
  { value: 0, short: 'មករា', full: 'មករា' },
  { value: 1, short: 'កុម្ភៈ', full: 'កុម្ភៈ' },
  { value: 2, short: 'មីនា', full: 'មីនា' },
  { value: 3, short: 'មេសា', full: 'មេសា' },
  { value: 4, short: 'ឧសភា', full: 'ឧសភា' },
  { value: 5, short: 'មិថុនា', full: 'មិថុនា' },
  { value: 6, short: 'កក្កដា', full: 'កក្កដា' },
  { value: 7, short: 'សីហា', full: 'សីហា' },
  { value: 8, short: 'កញ្ញា', full: 'កញ្ញា' },
  { value: 9, short: 'តុលា', full: 'តុលា' },
  { value: 10, short: 'វិច្ឆិកា', full: 'វិច្ឆិកា' },
  { value: 11, short: 'ធ្នូ', full: 'ធ្នូ' },
];

const MONTHS_EN = [
  { value: 0, short: 'Jan', full: 'January' },
  { value: 1, short: 'Feb', full: 'February' },
  { value: 2, short: 'Mar', full: 'March' },
  { value: 3, short: 'Apr', full: 'April' },
  { value: 4, short: 'May', full: 'May' },
  { value: 5, short: 'Jun', full: 'June' },
  { value: 6, short: 'Jul', full: 'July' },
  { value: 7, short: 'Aug', full: 'August' },
  { value: 8, short: 'Sep', full: 'September' },
  { value: 9, short: 'Oct', full: 'October' },
  { value: 10, short: 'Nov', full: 'November' },
  { value: 11, short: 'Dec', full: 'December' },
];

const DAYS_KM = ['អា', 'ច', 'អ', 'ព', 'ព្រ', 'សុ', 'ស'];
const DAYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Convert Western digits to Khmer digits
const toKhmerDigits = (num) => {
  const khDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(num)
    .split('')
    .map((char) => khDigits[parseInt(char, 10)] ?? char)
    .join('');
};

/**
 * Custom Date of Birth (DOB) Calendar Picker
 * - Full support for KH and EN
 * - 3 View Modes: 'days' (Calendar), 'months' (Grid), 'years' (Scrollable Grid)
 * - Exact styling matching the provided reference pictures
 */
export default function DobPicker({
  id = 'dob-picker',
  label,
  value = '', // Format: 'YYYY-MM-DD'
  onChange,
  error,
  required = false,
  helperText,
  className = '',
}) {
  const { language } = useLanguage();
  const isKm = language === 'km';

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'

  // Default display year around student age (e.g. 2008 or parsed from value)
  const defaultYear = 2008;
  const defaultMonth = 7; // August (0-indexed: 7)

  const parseInitialDate = () => {
    if (value && value.includes('-')) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return { year: y, month: m, day: d };
        }
      }
    }
    return { year: defaultYear, month: defaultMonth, day: null };
  };

  const parsed = parseInitialDate();
  const [displayYear, setDisplayYear] = useState(parsed.year);
  const [displayMonth, setDisplayMonth] = useState(parsed.month);
  const [selectedDay, setSelectedDay] = useState(parsed.day);
  const [selectedMonth, setSelectedMonth] = useState(parsed.day ? parsed.month : null);
  const [selectedYear, setSelectedYear] = useState(parsed.day ? parsed.year : null);

  const containerRef = useRef(null);
  const yearsListRef = useRef(null);

  // Sync with value prop changes
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          setSelectedYear(y);
          setSelectedMonth(m);
          setSelectedDay(d);
          setDisplayYear(y);
          setDisplayMonth(m);
        }
      }
    } else {
      setSelectedDay(null);
      setSelectedMonth(null);
      setSelectedYear(null);
    }
  }, [value]);

  // Click outside listener to close popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setViewMode('days');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll to selected year when switching to 'years' view
  useEffect(() => {
    if (viewMode === 'years' && yearsListRef.current) {
      const activeEl = yearsListRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [viewMode]);

  // Generate Year Range (from 1980 to current year - 5)
  const currentYear = new Date().getFullYear();
  const startYear = 1985;
  const endYear = currentYear - 6;
  const yearsArray = [];
  for (let y = startYear; y <= endYear; y++) {
    yearsArray.push(y);
  }

  // Days in month calculation
  const getDaysInMonth = (y, m) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (y, m) => {
    return new Date(y, m, 1).getDay(); // 0 = Sun, 1 = Mon ...
  };

  const totalDays = getDaysInMonth(displayYear, displayMonth);
  const firstDay = getFirstDayOfWeek(displayYear, displayMonth);

  // Month navigation handlers
  const prevMonth = (e) => {
    e.stopPropagation();
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear((prev) => prev - 1);
    } else {
      setDisplayMonth((prev) => prev - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear((prev) => prev + 1);
    } else {
      setDisplayMonth((prev) => prev + 1);
    }
  };

  // Day click handler
  const handleSelectDay = (day) => {
    setSelectedDay(day);
    setSelectedMonth(displayMonth);
    setSelectedYear(displayYear);

    const mStr = String(displayMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const formattedDate = `${displayYear}-${mStr}-${dStr}`;

    if (onChange) {
      onChange(formattedDate);
    }
    setIsOpen(false);
    setViewMode('days');
  };

  // Month click handler
  const handleSelectMonth = (monthIndex) => {
    setDisplayMonth(monthIndex);
    setViewMode('days');
  };

  // Year click handler
  const handleSelectYear = (yearNum) => {
    setDisplayYear(yearNum);
    setViewMode('months');
  };

  const months = isKm ? MONTHS_KM : MONTHS_EN;
  const daysOfWeek = isKm ? DAYS_KM : DAYS_EN;
  const currentMonthObj = months[displayMonth] || months[0];

  // Header Title String
  const getHeaderTitle = () => {
    if (isKm) {
      return `${currentMonthObj.full} ${toKhmerDigits(displayYear)}`;
    }
    return `${currentMonthObj.full} ${displayYear}`;
  };

  // Formatted Input Value Display
  const getDisplayValue = () => {
    if (selectedDay && selectedMonth !== null && selectedYear) {
      const monthObj = months[selectedMonth];
      if (isKm) {
        return `ថ្ងៃទី ${toKhmerDigits(selectedDay)} ${monthObj.full} ${toKhmerDigits(selectedYear)}`;
      }
      return `${monthObj.full} ${selectedDay}, ${selectedYear}`;
    }
    return '';
  };

  const defaultLabel = isKm ? 'ថ្ងៃខែឆ្នាំកំណើត' : 'Date of Birth';
  const defaultPlaceholder = isKm ? 'ជ្រើសរើសថ្ងៃខែឆ្នាំកំណើត' : 'Select date of birth';

  return (
    <div id={id} ref={containerRef} className={`relative space-y-1.5 font-kh-body ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-white/90 select-none leading-relaxed flex items-center gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5 text-white/80 shrink-0" />
          <span>{label || defaultLabel}</span>
          {required && <span className="text-[#38BDF8] font-bold">*</span>}
        </label>
      </div>

      {/* Trigger Input Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white/[0.04] border rounded-xl py-2.5 px-3.5 flex items-center justify-between text-xs sm:text-sm cursor-pointer transition-colors duration-150 select-none ${
          error
            ? 'border-rose-400/80 focus:ring-2 focus:ring-rose-400/20'
            : isOpen
            ? 'border-[#38BDF8] ring-2 ring-[#38BDF8]/20'
            : 'border-white/15 hover:border-white/30'
        }`}
      >
        <span
          className={`truncate ${
            getDisplayValue()
              ? 'text-white font-medium'
              : 'text-white/50 font-light'
          }`}
        >
          {getDisplayValue() || defaultPlaceholder}
        </span>
        <div className="flex items-center gap-1.5 text-white/70 shrink-0 ml-2">
          {getDisplayValue() && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDay(null);
                setSelectedMonth(null);
                setSelectedYear(null);
                if (onChange) onChange('');
              }}
              className="p-1 hover:text-white rounded-md transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <CalendarIcon className="h-4 w-4 text-white/80" />
        </div>
      </div>

      {/* Error Message / Helper Text */}
      {error ? (
        <p className="text-xs text-rose-300 flex items-center gap-1 mt-1 leading-relaxed">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-white/65 mt-1 leading-relaxed">
          {helperText}
        </p>
      ) : null}

      {/* Popover Calendar Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 sm:left-auto right-0 sm:right-auto z-50 mt-1 w-full sm:w-[320px] bg-[#194350] border border-white/15 rounded-2xl shadow-2xl p-4 font-kh-body text-white"
            style={{ minWidth: '290px' }}
          >
            {/* Header: Month Year Switcher & Prev/Next Arrows */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
              <button
                type="button"
                onClick={() => {
                  if (viewMode === 'days') setViewMode('months');
                  else if (viewMode === 'months') setViewMode('years');
                  else setViewMode('days');
                }}
                className="flex items-center gap-1.5 font-bold text-sm text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>{getHeaderTitle()}</span>
                <ChevronDown
                  className={`h-4 w-4 text-white/70 transition-transform duration-200 ${
                    viewMode !== 'days' ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Navigation Arrows for Month navigation (Only in Days View) */}
              {viewMode === 'days' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    aria-label="Previous Month"
                    className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Next Month"
                    className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 1. DAYS CALENDAR VIEW */}
            {viewMode === 'days' && (
              <div>
                {/* Days of week header */}
                <div className="grid grid-cols-7 text-center text-xs font-semibold text-white/65 mb-2">
                  {daysOfWeek.map((dayName, idx) => (
                    <div key={idx} className="py-1">
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-1 text-center text-xs sm:text-sm">
                  {/* Empty slots before day 1 */}
                  {Array.from({ length: firstDay }, (_, i) => (
                    <div key={`empty-${i}`} className="p-1" />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: totalDays }, (_, i) => {
                    const dayNum = i + 1;
                    const isSelected =
                      selectedDay === dayNum &&
                      selectedMonth === displayMonth &&
                      selectedYear === displayYear;

                    return (
                      <div key={`day-${dayNum}`} className="flex items-center justify-center p-0.5">
                        <button
                          type="button"
                          onClick={() => handleSelectDay(dayNum)}
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#38BDF8] text-[#092731] font-bold shadow-sm'
                              : 'text-white hover:bg-white/12'
                          }`}
                        >
                          {isKm ? toKhmerDigits(dayNum) : dayNum}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. MONTHS GRID VIEW */}
            {viewMode === 'months' && (
              <div className="grid grid-cols-3 gap-2.5 py-2">
                {months.map((m) => {
                  const isSelected =
                    displayMonth === m.value &&
                    selectedYear === displayYear;

                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => handleSelectMonth(m.value)}
                      className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#38BDF8] text-[#092731] shadow-sm'
                          : 'text-white hover:bg-white/12'
                      }`}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. YEARS SCROLLABLE GRID VIEW */}
            {viewMode === 'years' && (
              <div
                ref={yearsListRef}
                className="grid grid-cols-4 gap-2 py-2 max-h-56 overflow-y-auto pr-1"
              >
                {yearsArray.map((yr) => {
                  const isSelected = displayYear === yr;

                  return (
                    <button
                      key={yr}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => handleSelectYear(yr)}
                      className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-medium transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#38BDF8] text-[#092731] font-bold shadow-sm'
                          : 'text-white hover:bg-white/12'
                      }`}
                    >
                      {isKm ? toKhmerDigits(yr) : yr}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Helper / Actions at Bottom */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/75">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setDisplayYear(today.getFullYear());
                  setDisplayMonth(today.getMonth());
                  setViewMode('days');
                }}
                className="hover:text-white font-medium cursor-pointer"
              >
                {isKm ? 'ឆ្នាំបច្ចុប្បន្ន' : 'Current Year'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setViewMode('days');
                }}
                className="font-bold text-white hover:underline cursor-pointer"
              >
                {isKm ? 'យល់ព្រម' : 'Done'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
