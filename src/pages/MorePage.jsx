import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calculator,
  PenLine,
  Bookmark,
  Globe,
  Download,
  HeartHandshake,
  BookPlus,
  History,
  BookCheck,
  Eraser,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePWAInstall } from '../hooks/usePWA';
import SupportModal from '../components/common/SupportModal';
import RecommendBookModal from '../components/common/RecommendBookModal';
import ClearStorageModal from '../components/common/ClearStorageModal';
import { getOfflineBooksMetadata } from '../utils/offlineLibrary';
import { toKhmerNumber } from '../data/librarySubjects';

const TILE_CLASSES =
  'bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-2xl p-5 sm:p-6 min-h-[124px] flex flex-col items-center justify-center text-center gap-3 transition-[transform,background-color,border-color] duration-200 ease-out transform-gpu hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer group';

const tileTransition = (index) => ({
  duration: 0.24,
  delay: index * 0.025,
  ease: [0.16, 1, 0.3, 1],
});

export default function MorePage() {
  const { language, toggleLanguage } = useLanguage();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [isClearStorageOpen, setIsClearStorageOpen] = useState(false);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const isKm = language === 'km';

  const refreshDownloadedCount = useCallback(async () => {
    try {
      const list = await getOfflineBooksMetadata();
      setDownloadedCount(Array.isArray(list) ? list.length : 0);
    } catch {
      setDownloadedCount(0);
    }
  }, []);

  useEffect(() => {
    refreshDownloadedCount();
    const handleUpdate = () => refreshDownloadedCount();
    window.addEventListener('wsd:library-offline-updated', handleUpdate);
    return () => {
      window.removeEventListener('wsd:library-offline-updated', handleUpdate);
    };
  }, [refreshDownloadedCount]);

  const linkTiles = [
    {
      to: '/downloads',
      icon: BookCheck,
      label: isKm
        ? downloadedCount > 0
          ? `សៀវភៅបានទាញយក (${toKhmerNumber(downloadedCount)})`
          : 'សៀវភៅបានទាញយក'
        : downloadedCount > 0
        ? `Downloaded Books (${downloadedCount})`
        : 'Downloaded Books',
    },
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
    {
      to: '/history',
      icon: History,
      label: isKm ? 'ប្រវត្តិសិក្សា' : 'Study History',
    },
    {
      to: '/admin',
      icon: ShieldCheck,
      label: isKm ? 'ផ្ទាំងគ្រប់គ្រង' : 'Admin Panel',
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
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tileTransition(0)}
          type="button"
          id="more-recommend-book-btn"
          onClick={() => setIsRecommendOpen(true)}
          className={TILE_CLASSES}
        >
          <BookPlus className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform duration-200 ease-out" />
          <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
            {isKm ? 'ណែនាំសៀវភៅ' : 'Recommend Book'}
          </span>
        </motion.button>

        {/* Support / Donate QR Tile */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tileTransition(1)}
          type="button"
          id="more-support-btn"
          onClick={() => setIsSupportOpen(true)}
          className={TILE_CLASSES}
        >
          <HeartHandshake className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform duration-200 ease-out" />
          <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
            {isKm ? 'ឧបត្ថម្ភ' : 'Support'}
          </span>
        </motion.button>

        {linkTiles.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={tileTransition(idx + 2)}
            >
              <Link to={item.to} className={`${TILE_CLASSES} h-full`}>
                <Icon className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform duration-200 ease-out" />
                <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
                  {item.label}
                </span>
              </Link>
            </motion.div>
          );
        })}

        {/* Clean Device Storage Tile */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tileTransition(8)}
          type="button"
          id="more-clear-storage-btn"
          onClick={() => setIsClearStorageOpen(true)}
          className={TILE_CLASSES}
        >
          <Eraser className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform duration-200 ease-out" />
          <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
            {isKm ? 'សម្អាតទិន្នន័យ' : 'Clean Storage'}
          </span>
        </motion.button>

        {/* Language Toggle Tile */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tileTransition(9)}
          type="button"
          onClick={toggleLanguage}
          className={TILE_CLASSES}
        >
          <Globe className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform duration-200 ease-out" />
          <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
            {isKm ? 'ប្ដូរភាសា · ខ្មែរ / EN' : 'Language · EN / KH'}
          </span>
        </motion.button>

        {/* Optional PWA Install Tile when installable */}
        {isInstallable && !isInstalled && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tileTransition(10)}
            type="button"
            onClick={install}
            className={TILE_CLASSES}
          >
            <Download className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform duration-200 ease-out" />
            <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
              {isKm ? 'ដំឡើងកម្មវិធី' : 'Install App'}
            </span>
          </motion.button>
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

      <ClearStorageModal
        isOpen={isClearStorageOpen}
        onClose={() => setIsClearStorageOpen(false)}
      />
    </div>
  );
}
