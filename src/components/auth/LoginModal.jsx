import React, { useState } from 'react';
import {
  LogIn,
  IdCard,
  Lock,
  AlertCircle,
} from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }) {
  const { login, isAuthLoading } = useAuth();
  const { language } = useLanguage();

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const isKm = language === 'km';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId.trim() || !password) {
      setError(
        isKm
          ? 'សូមបញ្ចូលលេខសម្គាល់សិស្ស និងពាក្យសម្ងាត់'
          : 'Please enter Student ID and Password'
      );
      return;
    }

    const res = await login(studentId, password);
    if (!res.success) {
      setError(res.error);
    } else {
      setError('');
      setStudentId('');
      setPassword('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={isKm ? 'ចូលប្រើប្រាស់' : 'Sign In'}
      subtitle={
        isKm
          ? 'បញ្ចូលលេខសម្គាល់សិស្ស និងពាក្យសម្ងាត់ដើម្បីចូលរៀន'
          : 'Enter your Student ID and Password to sign in'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-kh-body">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/55 text-rose-200 text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Student ID */}
        <Input
          id="login-student-id"
          label={isKm ? 'លេខសម្គាល់សិស្ស' : 'Student ID'}
          placeholder={isKm ? 'បញ្ចូលលេខសម្គាល់សិស្ស' : 'Enter student ID'}
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setError('');
          }}
          leftIcon={IdCard}
          required
          autoFocus
        />

        {/* Password */}
        <div className="space-y-1">
          <Input
            id="login-password"
            label={isKm ? 'ពាក្យសម្ងាត់' : 'Password'}
            type={showPassword ? 'text' : 'password'}
            placeholder={isKm ? 'បញ្ចូលពាក្យសម្ងាត់' : 'Enter password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            leftIcon={Lock}
            required
          />

          <div className="flex items-center justify-between pt-1 text-xs text-white/80">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-[#38BDF8]/70 text-[#38BDF8] focus:ring-[#38BDF8] accent-[#38BDF8]"
              />
              <span>{isKm ? 'បង្ហាញពាក្យសម្ងាត់' : 'Show password'}</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 space-y-2.5">
          <button
            type="submit"
            disabled={isAuthLoading}
            className="w-full inline-flex items-center justify-center font-kh-body font-bold transition-colors duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/40 disabled:opacity-50 disabled:cursor-not-allowed bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] rounded-xl text-base px-5 py-2.5 gap-2.5 min-h-[46px]"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            <span className="truncate leading-relaxed tracking-wide">
              {isKm ? 'ចូលគណនី' : 'Sign In'}
            </span>
          </button>

          {/* Switch to Register */}
          <div className="text-center text-xs text-white/75 pt-1">
            {isKm ? 'មិនទាន់មានគណនី?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-bold text-white hover:text-[#38BDF8] underline ml-1 cursor-pointer"
            >
              {isKm ? 'ចុះឈ្មោះនៅទីនេះ' : 'Register here'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
