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
  TrendingUp,
  BookOpen,
  Settings,
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

  const studyTiles = [
    {
      to: '/graph',
      icon: TrendingUp,
      label: isKm ? 'គូសសង់ក្រាហ្វ' : 'Graphing Lab',
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
      to: '/history',
      icon: History,
      label: isKm ? 'ប្រវត្តិសិក្សា' : 'Study History',
    },
  ];

  const generalItems = [
    {
      id: 'more-recommend-book-btn',
      type: 'button',
      onClick: () => setIsRecommendOpen(true),
      icon: BookPlus,
      label: isKm ? 'ណែនាំសៀវភៅ' : 'Recommend Book',
    },
    {
      id: 'more-support-btn',
      type: 'button',
      onClick: () => setIsSupportOpen(true),
      icon: HeartHandshake,
      label: isKm ? 'ឧបត្ថម្ភ' : 'Support',
    },
    {
      id: 'more-clear-storage-btn',
      type: 'button',
      onClick: () => setIsClearStorageOpen(true),
      icon: Eraser,
      label: isKm ? 'សម្អាតទិន្នន័យ' : 'Clean Storage',
    },
    {
      id: 'more-language-btn',
      type: 'button',
      onClick: toggleLanguage,
      icon: Globe,
      label: isKm ? 'ប្ដូរភាសា · ខ្មែរ / EN' : 'Language · EN / KH',
    },
    {
      id: 'more-admin-link',
      type: 'link',
      to: '/admin',
      icon: ShieldCheck,
      label: isKm ? 'ផ្ទាំងគ្រប់គ្រង' : 'Admin Panel',
    },
    ...(isInstallable && !isInstalled
      ? [
          {
            id: 'more-install-btn',
            type: 'button',
            onClick: install,
            icon: Download,
            label: isKm ? 'ដំឡើងកម្មវិធី' : 'Install App',
          },
        ]
      : []),
  ];

  return (
    <div id="more-page" className="space-y-8 font-kh-body pb-8">
      <header className="pb-4 border-b border-white/10">
        <h1 className="font-kh-title text-2xl text-white">
          {isKm ? 'ច្រើនទៀត' : 'More'}
        </h1>
      </header>

      {/* Section 1: Study Features (ផ្នែកសិក្សា) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 text-white/90 inline-flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </span>
          <h2 className="font-kh-title text-lg text-white">
            {isKm ? 'ផ្នែកសិក្សា' : 'Study Tools'}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {studyTiles.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={tileTransition(idx)}
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
        </div>
      </section>

      {/* Section 2: General Features (ផ្នែកទូទៅ) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 text-white/90 inline-flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4" />
          </span>
          <h2 className="font-kh-title text-lg text-white">
            {isKm ? 'ផ្នែកទូទៅ' : 'General'}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {generalItems.map((item, idx) => {
            const Icon = item.icon;
            const delayIdx = studyTiles.length + idx;
            if (item.type === 'link') {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={tileTransition(delayIdx)}
                >
                  <Link to={item.to} id={item.id} className={`${TILE_CLASSES} h-full`}>
                    <Icon className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform duration-200 ease-out" />
                    <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              );
            }

            return (
              <motion.button
                key={item.id}
                id={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={tileTransition(delayIdx)}
                type="button"
                onClick={item.onClick}
                className={TILE_CLASSES}
              >
                <Icon className="w-7 h-7 text-[#38BDF8] group-hover:scale-105 transition-transform duration-200 ease-out" />
                <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

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
