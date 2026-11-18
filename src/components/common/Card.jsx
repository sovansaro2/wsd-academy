import React from 'react';

/**
 * Reusable Card Component on #194350 theme (bg-transparent, soft orange border, white text).
 * Supports both standalone prop-based and compound sub-components.
 */
export default function Card({
  children,
  title,
  subtitle,
  footer,
  headerAction,
  hoverable = false,
  padding = 'md', // 'none' | 'sm' | 'md' | 'lg'
  className = '',
  onClick,
  ...props
}) {
  const paddingMap = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const hoverStyles = hoverable
    ? 'hover:bg-white/[0.08] hover:border-white/20 transition-all duration-150 cursor-pointer'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-white/[0.05] border border-white/10 rounded-2xl text-white font-kh-body overflow-hidden ${hoverStyles} ${className}`}
      {...props}
    >
      {/* Optional Auto Header if title or subtitle passed */}
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-white/10 gap-4">
          <div className="space-y-1 min-w-0">
            {title && (
              <h3 className="font-kh-title text-base sm:text-lg text-white leading-snug tracking-wide">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}

      {/* Main Content */}
      <div className={title || subtitle || headerAction ? paddingMap[padding] : paddingMap[padding] || ''}>
        {children}
      </div>

      {/* Optional Auto Footer */}
      {footer && (
        <div className="p-4 sm:p-5 bg-transparent border-t border-white/10 flex items-center justify-between gap-3 text-xs text-white/75">
          {footer}
        </div>
      )}
    </div>
  );
}

// Compound Sub-components for flexible composition
Card.Header = function CardHeader({ children, className = '', ...props }) {
  return (
    <div
      className={`p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className = '', ...props }) {
  return (
    <h3
      className={`font-kh-title text-base sm:text-lg text-white leading-snug tracking-wide ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

Card.Description = function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-xs sm:text-sm text-white/75 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
};

Card.Content = function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-5 sm:p-6 space-y-3 ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className = '', ...props }) {
  return (
    <div
      className={`p-4 sm:p-5 bg-transparent border-t border-white/10 flex items-center justify-between gap-3 text-xs text-white/75 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
