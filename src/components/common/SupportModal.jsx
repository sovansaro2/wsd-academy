import React, { useEffect, useState, useCallback } from 'react';
import { Download, Check, ExternalLink, HeartHandshake } from 'lucide-react';
import Modal from './Modal';
import DotsLoader from './DotsLoader';
import { useLanguage } from '../../context/LanguageContext';

const SUPPORT_KHQR_IMAGE = '/assets/aistudio/payment_59b84423.JPG';
const SUPPORT_TELEGRAM_URL = 'https://t.me/sovansaro';

export default function SupportModal({ isOpen, onClose }) {
  const { language } = useLanguage();
  const isKm = language === 'km';

  const [downloaded, setDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDownloaded(false);
    }
  }, [isOpen]);

  const handleDownloadQR = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const triggerDownload = (href) => {
      const link = document.createElement('a');
      link.href = href;
      link.download = 'WSD-Academy-KHQR.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    try {
      const response = await fetch(SUPPORT_KHQR_IMAGE);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      triggerDownload(SUPPORT_KHQR_IMAGE);
    } finally {
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
      setIsDownloading(false);
    }
  }, [isDownloading]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={isKm ? 'ឧបត្ថម្ភ WSD Academy' : 'Support WSD Academy'}
      subtitle={
        isKm
          ? 'ស្កេន KHQR ឬទាញយករូបភាពដើម្បីចូលរួមគាំទ្រ'
          : 'Scan the KHQR or download the image to support'
      }
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Authentic ACLEDA Bank KHQR Card */}
        <div className="relative w-full max-w-[250px] sm:max-w-[270px] rounded-2xl overflow-hidden bg-[#0A1F3C] shadow-lg border border-white/15">
          {!imgLoaded && (
            <div className="aspect-[2/3] w-full flex items-center justify-center bg-[#0A1F3C]">
              <DotsLoader size="md" color="light" />
            </div>
          )}
          <img
            src={SUPPORT_KHQR_IMAGE}
            alt={
              isKm
                ? 'ACLEDA Bank KHQR សម្រាប់ឧបត្ថម្ភ WSD Academy (រឹម រ៉ារី)'
                : 'ACLEDA Bank KHQR for supporting WSD Academy'
            }
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
            className={`w-full h-auto block object-contain select-none transition-opacity duration-200 ${
              imgLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
          />
          <div className="bg-[#0F2F3A] px-3 py-2 flex items-center justify-center gap-1.5 border-t border-white/10">
            <HeartHandshake className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
            <span className="text-[11px] font-semibold text-white/90">
              {isKm ? 'ស្កេន KHQR ដើម្បីឧបត្ថម្ភ' : 'Scan KHQR to Support'}
            </span>
          </div>
        </div>

        <p className="text-xs text-white/75 text-center leading-relaxed px-2">
          {isKm
            ? 'រាល់ការចូលរួមឧបត្ថម្ភរបស់អ្នក ជួយដល់ការអភិវឌ្ឍមេរៀន និងរក្សាប្រព័ន្ធឲ្យដំណើរការសម្រាប់សិស្សានុសិស្ស។'
            : 'Every contribution helps maintain servers and expand learning resources for students.'}
        </p>

        {/* Actions */}
        <div className="w-full space-y-2.5 pt-1">
          <button
            type="button"
            id="download-support-qr-btn"
            onClick={handleDownloadQR}
            disabled={isDownloading}
            className="w-full py-3 px-4 bg-[#38BDF8] hover:bg-[#56CAF9] disabled:opacity-60 text-[#092731] font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {downloaded ? (
              <>
                <Check className="w-4 h-4" />
                <span>{isKm ? 'បានទាញយក QR Code រួចរាល់' : 'QR Code Downloaded'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{isKm ? 'ទាញយក QR Code' : 'Download QR Code'}</span>
              </>
            )}
          </button>

          <a
            href={SUPPORT_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 text-white text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-[#38BDF8]" />
            <span>{isKm ? 'ទំនាក់ទំនងតាម Telegram' : 'Open Telegram Contact'}</span>
          </a>
        </div>
      </div>
    </Modal>
  );
}
