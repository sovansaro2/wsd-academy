import React from 'react';

const SIZE_MAP = {
  xs: {
    dot: 'w-1.5 h-1.5',
    gap: 'gap-1',
  },
  sm: {
    dot: 'w-2 h-2',
    gap: 'gap-1.5',
  },
  md: {
    dot: 'w-2.5 h-2.5',
    gap: 'gap-2',
  },
  lg: {
    dot: 'w-3 h-3',
    gap: 'gap-2.5',
  },
};

const COLOR_MAP = {
  accent: 'bg-[#38BDF8]',
  white: 'bg-white',
  dark: 'bg-[#092731]',
  current: 'bg-current',
};

/**
 * Lightweight 3-dot wave loading indicator using GPU-composited keyframes.
 */
export default function DotsLoader({
  size = 'sm',
  color = 'accent',
  label = '',
  className = '',
}) {
  const dims = SIZE_MAP[size] || SIZE_MAP.sm;
  const dotColor = COLOR_MAP[color] || COLOR_MAP.accent;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
      className={`inline-flex items-center ${dims.gap} shrink-0 ${className}`}
    >
      <span className={`inline-flex items-center ${dims.gap}`}>
        {[0, 150, 300].map((delayMs) => (
          <span
            key={delayMs}
            aria-hidden="true"
            className={`wsd-dot rounded-full ${dims.dot} ${dotColor}`}
            style={{ animationDelay: `${delayMs}ms` }}
          />
        ))}
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}
