import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

/**
 * Clean Language Switcher button (KH / EN) with light theme styling and smooth state transition.
 */
export default function LanguageToggle({ showIcon = false, className = '' }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      id="language-toggle-wrapper"
      className={`inline-flex items-center p-1 bg-white/[0.07] rounded-xl select-none ${className}`}
      role="group"
      aria-label="Language Selector"
    >
      {showIcon && (
        <Globe className="h-3.5 w-3.5 text-white/70 ml-1.5 mr-1 shrink-0" />
      )}

      <button
        type="button"
        id="lang-btn-kh"
        onClick={() => setLanguage('km')}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-kh-body transition-all duration-150 cursor-pointer ${
          language === 'km'
            ? 'bg-[#38BDF8]/18 text-[#38BDF8] font-bold shadow-xs'
            : 'text-white/65 hover:text-white'
        }`}
        aria-pressed={language === 'km'}
      >
        KH
      </button>

      <button
        type="button"
        id="lang-btn-en"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-rajdhani transition-all duration-150 cursor-pointer ${
          language === 'en'
            ? 'bg-[#38BDF8]/18 text-[#38BDF8] font-bold shadow-xs'
            : 'text-white/65 hover:text-white'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  );
}
