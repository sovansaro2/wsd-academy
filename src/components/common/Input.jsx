import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable Input / Textarea Component with Light Theme styling,
 * bilingual typography, and comprehensive state handling.
 */
const Input = forwardRef(function Input(
  {
    id,
    name,
    label,
    type = 'text',
    as = 'input', // 'input' | 'textarea'
    placeholder,
    value,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    error,
    helperText,
    required = false,
    disabled = false,
    readOnly = false,
    rows = 4,
    leftIcon: LeftIcon = null,
    rightIcon: RightIcon = null,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const isTextarea = as === 'textarea' || type === 'textarea';
  const inputId = id || name || `input-${Math.random().toString(36).substring(2, 9)}`;

  // Base field classes on #194350 with quiet idle border and soft orange focus ring
  const fieldBaseStyles =
    'w-full bg-white/[0.04] border text-white placeholder:text-white/45 placeholder:font-light font-kh-body text-sm rounded-xl transition-colors duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  const stateStyles = error
    ? 'border-rose-400/80 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/25'
    : 'border-white/15 focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 hover:border-white/30';

  const paddingStyles = isTextarea
    ? 'p-3 leading-relaxed'
    : `${LeftIcon ? 'pl-10' : 'pl-3.5'} ${RightIcon || error ? 'pr-10' : 'pr-3.5'} py-2.5 leading-relaxed`;

  return (
    <div className={`space-y-1.5 font-kh-body ${containerClassName}`}>
      {/* Optional Label with required indicator */}
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-white/90 select-none leading-relaxed"
          >
            {label}
            {required && <span className="text-[#38BDF8] ml-1 font-bold">*</span>}
          </label>
        </div>
      )}

      {/* Input / Textarea Wrapper */}
      <div className="relative">
        {LeftIcon && !isTextarea && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none">
            <LeftIcon className="h-4 w-4" />
          </div>
        )}

        {isTextarea ? (
          <textarea
            ref={ref}
            id={inputId}
            name={name}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={`${fieldBaseStyles} ${stateStyles} ${paddingStyles} resize-y min-h-[90px] ${className}`}
            {...props}
          />
        ) : (
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={`${fieldBaseStyles} ${stateStyles} ${paddingStyles} ${className}`}
            {...props}
          />
        )}

        {/* Right Icon / Error Icon */}
        {!isTextarea && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-white/60">
            {error ? (
              <AlertCircle className="h-4 w-4 text-rose-400" />
            ) : RightIcon ? (
              <RightIcon className="h-4 w-4" />
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text or Error Message */}
      {error ? (
        <p className="text-xs text-rose-300 flex items-center gap-1 mt-1 leading-relaxed">
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
