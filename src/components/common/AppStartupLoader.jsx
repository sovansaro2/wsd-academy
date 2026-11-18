import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DotsLoader from './DotsLoader';
import logoNameImg from '../../assets/logoname.png';

/**
 * Initial App Startup Splash Screen
 * Displays briefly on first app open with the brand logo and smooth Dots Loading animation,
 * then fades smoothly into the main application.
 */
export default function AppStartupLoader({ durationMs = 900 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    const timer = window.setTimeout(
      () => setIsVisible(false),
      prefersReducedMotion ? 250 : durationMs
    );

    return () => window.clearTimeout(timer);
  }, [durationMs]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="app-startup-loader"
          role="status"
          aria-live="polite"
          aria-label="កំពុងបើកកម្មវិធី WSD Academy"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-[100] bg-[#194350] flex flex-col items-center justify-center px-6 select-none pointer-events-auto"
        >
          <motion.div
            initial={{ opacity: 0.9, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <img
              src={logoNameImg}
              alt="WSD Academy"
              className="h-16 sm:h-20 w-auto object-contain drop-shadow-sm"
            />
            <DotsLoader size="md" color="accent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
