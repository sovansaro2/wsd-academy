import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  PenLine,
  Bookmark,
  Globe,
  Download,
  HeartHandshake,
  BookPlus,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePWAInstall } from '../hooks/usePWA';
import SupportModal from '../components/common/SupportModal';
import RecommendBookModal from '../components/common/RecommendBookModal';

export default function MorePage() {
  const { language, toggleLanguage } = useLanguage();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const isKm = language === 'km';

  const linkTiles = [
    {
      to: '/solver',
      icon: Calculator,
      label: isKm ? 'ដោះស្រាយលំហាត់' : 'Problem Solver',
    },
    {
      to: '/resource',
      icon: PenLine,
      label: isKm ? 'តែងសេចក្ដី' : 'Essay Writing',
    },
    {
      to: '/profile?view=bookmark',
      icon: Bookmark,
      label: isKm ? 'តែងសេចក្ដីរក្សាទុក' : 'Saved Essays',
    },
  ];

  return (
    <div id="more-page" className="space-y-5 font-kh-body pb-8">
      <header className="pb-4 border-b border-white/10">
        <h1 className="font-kh-title text-2xl text-white">
          {isKm ? 'ច្រើនទៀត' : 'More'}
        </h1>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Book Recommendation Tile */}
        <button
          type="button"
          id="more-recommend-book-btn"
          onClick={() => setIsRecommendOpen(true)}
          className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-2xl p-5 sm:p-6 min-h-[124px] flex flex-col items-center justify-center text-center gap-3 transition-colors cursor-pointer group"
        >
          <BookPlus className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform" />
          <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
            {isKm ? 'ណែនាំសៀវភៅ' : 'Recommend Book'}
          </span>
        </button>

        {/* Support / Donate QR Tile */}
        <button
          type="button"
          id="more-support-btn"
          onClick={() => setIsSupportOpen(true)}
          className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-2xl p-5 sm:p-6 min-h-[124px] flex flex-col items-center justify-center text-center gap-3 transition-colors cursor-pointer group"
        >
          <HeartHandshake className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform" />
          <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
            {isKm ? 'ឧបត្ថម្ភ' : 'Support'}
          </span>
        </button>

        {linkTiles.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-2xl p-5 sm:p-6 min-h-[124px] flex flex-col items-center justify-center text-center gap-3 transition-colors cursor-pointer group"
            >
              <Icon className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform" />
              <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Language Toggle Tile */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-2xl p-5 sm:p-6 min-h-[124px] flex flex-col items-center justify-center text-center gap-3 transition-colors cursor-pointer group"
        >
          <Globe className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform" />
          <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
            {isKm ? 'ប្ដូរភាសា · ខ្មែរ / EN' : 'Language · EN / KH'}
          </span>
        </button>

        {/* Optional PWA Install Tile when installable */}
        {isInstallable && !isInstalled && (
          <button
            type="button"
            onClick={install}
            className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-2xl p-5 sm:p-6 min-h-[124px] flex flex-col items-center justify-center text-center gap-3 transition-colors cursor-pointer group"
          >
            <Download className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform" />
            <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
              {isKm ? 'ដំឡើងកម្មវិធី' : 'Install App'}
            </span>
          </button>
        )}
      </div>

      <RecommendBookModal
        isOpen={isRecommendOpen}
        onClose={() => setIsRecommendOpen(false)}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
    </div>
  );
}
