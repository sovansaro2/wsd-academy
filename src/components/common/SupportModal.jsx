import React, { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { Download, Check, ExternalLink, HeartHandshake } from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '../../context/LanguageContext';

const DEFAULT_SUPPORT_PAYLOAD =
  import.meta.env.VITE_SUPPORT_QR_PAYLOAD || 'https://t.me/sovansaro';
const SUPPORT_TELEGRAM_URL = 'https://t.me/sovansaro';

function roundRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default function SupportModal({ isOpen, onClose }) {
  const { language } = useLanguage();
  const isKm = language === 'km';

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDownloaded(false);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(DEFAULT_SUPPORT_PAYLOAD, {
      width: 560,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#092731',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR generation error:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleDownloadQR = useCallback(async () => {
    if (!qrDataUrl || isDownloading) return;
    setIsDownloading(true);

    try {
      const cardWidth = 680;
      const cardHeight = 840;
      const canvas = document.createElement('canvas');
      canvas.width = cardWidth;
      canvas.height = cardHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      // Clip to outer rounded card so top header inherits rounded corners cleanly
      ctx.save();
      roundRectPath(ctx, 0, 0, cardWidth, cardHeight, 36);
      ctx.clip();

      // Card background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cardWidth, cardHeight);

      // Header bar
      ctx.fillStyle = '#194350';
      ctx.fillRect(0, 0, cardWidth, 132);

      // Header title
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('WSD ACADEMY', cardWidth / 2, 62);

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(isKm ? 'ឧបត្ថម្ភគាំទ្រការអប់រំ' : 'Support WSD Academy', cardWidth / 2, 102);

      // Load generated QR image and draw centered
      const qrImg = new Image();
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      const qrSize = 480;
      const qrX = (cardWidth - qrSize) / 2;
      const qrY = 176;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Footer caption
      ctx.fillStyle = '#092731';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(
        isKm ? 'ស្កេន QR Code ដើម្បីឧបត្ថម្ភ' : 'Scan QR Code to Support',
        cardWidth / 2,
        720
      );

      ctx.fillStyle = '#475569';
      ctx.font = '20px sans-serif';
      ctx.fillText('WSD Academy · Digital Learning', cardWidth / 2, 764);

      const triggerDownload = (href) => {
        const link = document.createElement('a');
        link.href = href;
        link.download = 'WSD-Academy-Support-QR.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            triggerDownload(url);
            setTimeout(() => URL.revokeObjectURL(url), 4000);
          } else {
            triggerDownload(canvas.toDataURL('image/png'));
          }
          resolve();
        }, 'image/png');
      });

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (error) {
      console.error('QR download error:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [qrDataUrl, isDownloading, isKm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={isKm ? 'ឧបត្ថម្ភ WSD Academy' : 'Support WSD Academy'}
      subtitle={
        isKm
          ? 'ស្កេន QR Code ឬទាញយករូបភាពដើម្បីចូលរួមគាំទ្រ'
          : 'Scan the QR code or download the image to support'
      }
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Scannable QR Code Card */}
        <div className="w-full max-w-[280px] rounded-2xl overflow-hidden bg-white shadow-lg border border-white/15">
          <div className="bg-[#0F2F3A] px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-2 text-white font-rajdhani font-bold tracking-wider text-base">
              <HeartHandshake className="w-4 h-4 text-[#38BDF8]" />
              <span>WSD ACADEMY</span>
            </div>
            <p className="text-[11px] text-[#38BDF8] font-semibold mt-0.5">
              {isKm ? 'គាំទ្រកម្មវិធីសិក្សាឥតគិតថ្លៃ' : 'Support Free Learning'}
            </p>
          </div>

          <div className="p-4 flex flex-col items-center justify-center bg-white">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={isKm ? 'QR Code សម្រាប់ឧបត្ថម្ភ WSD Academy' : 'WSD Academy Support QR Code'}
                className="w-52 h-52 object-contain select-none"
              />
            ) : (
              <div className="w-52 h-52 rounded-xl bg-slate-100 animate-pulse" />
            )}
            <p className="mt-2 text-xs font-bold text-[#092731] text-center">
              {isKm ? 'ស្កេនដើម្បីឧបត្ថម្ភ' : 'Scan to Support'}
            </p>
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
            disabled={!qrDataUrl || isDownloading}
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
