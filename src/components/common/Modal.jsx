import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

/**
 * Reusable Modal / Dialog Component
 * - Mobile/PWA: Full-width bottom sheet docking to left, right & bottom with a smooth slide-up animation
 * - Desktop: Centered dialog with clean scaling & fade entrance
 */
export default function Modal({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  className = '',
}) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-5xl',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  // Animation variants adapted for mobile bottom-sheet vs desktop dialog
  const modalVariants = {
    initial: {
      y: isMobile ? '100%' : 16,
      opacity: isMobile ? 1 : 0,
      scale: isMobile ? 1 : 0.96,
    },
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        damping: 28,
        stiffness: 300,
        mass: 0.8,
      },
    },
    exit: {
      y: isMobile ? '100%' : 16,
      opacity: isMobile ? 1 : 0,
      scale: isMobile ? 1 : 0.96,
      transition: {
        duration: 0.22,
        ease: [0.32, 0, 0.67, 0],
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="modal-portal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden sm:overflow-y-auto"
        >
          {/* Backdrop with Soft Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Modal Container: Full Screen at bottom, left, right on mobile/PWA with smooth slide-up */}
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`relative w-full ${selectedSize} bg-[#194350] border-t sm:border border-white/15 rounded-t-[28px] sm:rounded-2xl rounded-b-none sm:rounded-b-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] z-10 font-kh-body text-white ${className}`}
          >
            {/* Mobile Sheet Handle Bar */}
            <div className="w-10 h-1.5 bg-white/25 rounded-full mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between px-5 pt-3 pb-4 sm:p-6 border-b border-white/10 gap-4">
                <div className="min-w-0 space-y-1">
                  {title && (
                    <h3 className="font-kh-title text-lg sm:text-xl text-white leading-snug tracking-wide">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>

                {showCloseButton && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="បិទផ្ទាំង (Close)"
                    className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-white/25"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Modal Body: Scrollable */}
            <div className="px-5 py-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-120px)] sm:max-h-[70vh] space-y-4 text-sm text-white leading-relaxed pb-8 sm:pb-6">
              {children}
            </div>

            {/* Modal Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 bg-transparent border-t border-white/10 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
