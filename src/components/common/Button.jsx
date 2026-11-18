import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button Component with Light Theme design system & crisp shadows.
 * Supports bilingual typography (Khmer & English) with appropriate line heights.
 */
export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  leftIcon: LeftIcon = null,
  rightIcon: RightIcon = null,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-kh-body font-medium transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const variantStyles = {
    primary:
      'bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] font-semibold shadow-sm active:bg-[#22ADEC]',
    secondary:
      'bg-white/[0.08] hover:bg-white/[0.15] text-white',
    outline:
      'bg-transparent hover:bg-white/10 text-white border border-white/20',
    ghost:
      'bg-transparent hover:bg-white/10 text-white/80 hover:text-white',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-sm active:bg-rose-700',
    icon:
      'bg-white/[0.07] hover:bg-white/15 text-white p-2 rounded-xl',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5 min-h-[34px]',
    md: 'text-sm px-4 py-2 rounded-xl gap-2 min-h-[40px]',
    lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5 min-h-[46px]',
    icon: 'p-2 rounded-xl aspect-square',
  };

  const finalSize = variant === 'icon' ? sizeStyles.icon : sizeStyles[size] || sizeStyles.md;
  const finalVariant = variantStyles[variant] || variantStyles.primary;
  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${finalVariant} ${finalSize} ${widthStyle} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : LeftIcon ? (
        <LeftIcon className="h-4 w-4 shrink-0" />
      ) : null}

      {children && (
        <span className="truncate leading-relaxed tracking-wide">
          {children}
        </span>
      )}

      {!isLoading && RightIcon ? (
        <RightIcon className="h-4 w-4 shrink-0" />
      ) : null}
    </button>
  );
}
