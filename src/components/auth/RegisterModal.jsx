import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  User,
  IdCard,
  Mail,
  Phone,
  Send,
  MapPin,
  Lock,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import DobPicker from '../common/DobPicker';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { generateStudentIdFromDob } from '../../utils/studentId';

const INITIAL_FORM_DATA = {
  last_name: '',
  first_name: '',
  gender: 'ប្រុស',
  date_of_birth: '',
  grade: 'ទី១២',
  classroom: '',
  address: '',
  email: '',
  phone: '',
  telegram: '',
  password: '',
  confirm_password: '',
};

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const { register, isAuthLoading } = useAuth();
  const { language } = useLanguage();

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [registeredId, setRegisteredId] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const isKm = language === 'km';
  const previewStudentId = generateStudentIdFromDob(formData.date_of_birth);

  useEffect(() => {
    if (!isOpen) {
      setRegisteredId('');
      setCopiedId(false);
      setServerError('');
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    setServerError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.last_name.trim()) {
      errs.last_name = isKm ? 'សូមបញ្ចូលគោត្តនាម' : 'Last name is required';
    }
    if (!formData.first_name.trim()) {
      errs.first_name = isKm ? 'សូមបញ្ចូលនាម' : 'First name is required';
    }
    if (!formData.date_of_birth) {
      errs.date_of_birth = isKm ? 'សូមជ្រើសរើសថ្ងៃខែឆ្នាំកំណើត' : 'Date of birth is required';
    }
    if (!formData.classroom.trim()) {
      errs.classroom = isKm ? 'សូមបញ្ចូលថ្នាក់រៀន' : 'Classroom is required';
    }
    if (!formData.address.trim()) {
      errs.address = isKm ? 'សូមបញ្ចូលទីលំនៅបច្ចុប្បន្ន' : 'Address is required';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = isKm ? 'សូមបញ្ចូលអ៊ីម៉ែលឱ្យបានត្រឹមត្រូវ' : 'Valid email is required';
    }
    if (!formData.phone.trim()) {
      errs.phone = isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទ' : 'Phone number is required';
    }
    if (!formData.password) {
      errs.password = isKm ? 'សូមបញ្ចូលពាក្យសម្ងាត់' : 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = isKm ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ ខ្ទង់' : 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirm_password) {
      errs.confirm_password = isKm ? 'ពាក្យសម្ងាត់ទាំងពីរមិនដូចគ្នាទេ' : 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const res = await register(formData);
    if (!res.success) {
      setServerError(res.error);
    } else {
      setRegisteredId(res.user?.student_id || previewStudentId);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const handleCopyId = async () => {
    if (!registeredId || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(registeredId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        registeredId
          ? isKm
            ? 'ចុះឈ្មោះគណនីបានជោគជ័យ'
            : 'Registration Successful'
          : isKm
          ? 'ចុះឈ្មោះគណនីសិស្ស'
          : 'Student Registration'
      }
      subtitle={
        registeredId
          ? isKm
            ? 'សូមរក្សាទុកលេខសម្គាល់សិស្សរបស់អ្នកសម្រាប់ចូលប្រើប្រាស់'
            : 'Please save your Student ID for future sign in'
          : isKm
          ? 'លេខសម្គាល់សិស្សនឹងត្រូវបង្កើតដោយស្វ័យប្រវត្តិពីថ្ងៃខែឆ្នាំកំណើត'
          : 'Your Student ID is automatically generated from your date of birth'
      }
    >
      {registeredId ? (
        <div className="space-y-5 py-2 font-kh-body text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.06] border border-white/10 space-y-2 max-w-sm mx-auto">
            <p className="text-xs text-white/75">
              {isKm ? 'លេខសម្គាល់សិស្សរបស់អ្នក (Student ID)' : 'Your Assigned Student ID'}
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <span className="font-rajdhani font-bold text-2xl sm:text-3xl text-[#38BDF8] tracking-wider">
                {registeredId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                title={isKm ? 'ចម្លង' : 'Copy'}
                className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white transition cursor-pointer"
              >
                {copiedId ? (
                  <Check className="h-4 w-4 text-[#38BDF8]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-white/65 leading-relaxed">
              {isKm
                ? 'ប្រើលេខសម្គាល់នេះជាមួយពាក្យសម្ងាត់ ដើម្បីចូលគណនីនៅលើកក្រោយ។'
                : 'Use this Student ID with your password when signing in.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full max-w-sm mx-auto inline-flex items-center justify-center font-kh-body font-bold transition-colors bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] rounded-xl text-base px-5 py-2.5 min-h-[46px] cursor-pointer"
          >
            {isKm ? 'ចាប់ផ្ដើមប្រើប្រាស់' : 'Start Learning'}
          </button>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4 font-kh-body">
        {serverError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/55 text-rose-200 text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* 1. Last Name & First Name (គោត្តនាម និង នាម) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="reg-last-name"
            label={isKm ? 'គោត្តនាម' : 'Last Name'}
            placeholder={isKm ? 'បញ្ចូលគោត្តនាម' : 'Enter last name'}
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            leftIcon={User}
            error={errors.last_name}
            required
          />
          <Input
            id="reg-first-name"
            label={isKm ? 'នាម' : 'First Name'}
            placeholder={isKm ? 'បញ្ចូលនាម' : 'Enter first name'}
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            leftIcon={User}
            error={errors.first_name}
            required
          />
        </div>

        {/* 3. Gender & Date of Birth (ភេទ និង ថ្ងៃខែឆ្នាំកំណើត) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
          {/* Gender */}
          <div className="sm:col-span-4 space-y-1.5">
            <label className="block text-xs font-medium text-white/90 leading-relaxed">
              {isKm ? 'ភេទ' : 'Gender'}
              <span className="text-[#38BDF8] font-bold ml-1">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'ប្រុស', labelKm: 'ប្រុស', labelEn: 'Male' },
                { value: 'ស្រី', labelKm: 'ស្រី', labelEn: 'Female' },
              ].map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => handleChange('gender', g.value)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer ${
                    formData.gender === g.value
                      ? 'bg-[#38BDF8] text-[#092731] font-bold'
                      : 'bg-white/[0.07] text-white/80 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {isKm ? g.labelKm : g.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Date of birth */}
          <div className="sm:col-span-8">
            <DobPicker
              id="reg-dob"
              label={isKm ? 'ថ្ងៃខែឆ្នាំកំណើត' : 'Date of Birth'}
              value={formData.date_of_birth}
              onChange={(val) => handleChange('date_of_birth', val)}
              error={errors.date_of_birth}
              required
            />
          </div>
        </div>

        {/* Auto-generated Student ID Preview (Read-only) */}
        <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <IdCard className="h-4 w-4 text-[#38BDF8] shrink-0" />
            <span className="text-xs text-white/75 truncate">
              {isKm ? 'លេខសម្គាល់សិស្ស (ស្វ័យប្រវត្តិ)' : 'Student ID (Auto-generated)'}
            </span>
          </div>
          <span
            id="reg-student-id-preview"
            className={`font-rajdhani font-bold tracking-wider text-sm shrink-0 ${
              previewStudentId ? 'text-[#38BDF8]' : 'text-white/45 font-kh-body font-normal text-xs'
            }`}
          >
            {previewStudentId ||
              (isKm ? 'រើសថ្ងៃខែឆ្នាំកំណើតជាមុន' : 'Select date of birth')}
          </span>
        </div>

        {/* 4. Grade Level & Classroom (កម្រិតសិក្សា និង ថ្នាក់) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/90 leading-relaxed">
              {isKm ? 'កម្រិតសិក្សា' : 'Grade Level'}
              <span className="text-[#38BDF8] font-bold ml-1">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: 'ទី១០', labelKm: 'ទី១០', labelEn: 'Grade 10' },
                { value: 'ទី១១', labelKm: 'ទី១១', labelEn: 'Grade 11' },
                { value: 'ទី១២', labelKm: 'ទី១២', labelEn: 'Grade 12' },
              ].map((gr) => (
                <button
                  key={gr.value}
                  type="button"
                  onClick={() => handleChange('grade', gr.value)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer ${
                    formData.grade === gr.value
                      ? 'bg-[#38BDF8] text-[#092731] font-bold'
                      : 'bg-white/[0.07] text-white/80 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {isKm ? gr.labelKm : gr.labelEn}
                </button>
              ))}
            </div>
          </div>

          <Input
            id="reg-class"
            label={isKm ? 'ថ្នាក់រៀន' : 'Classroom'}
            placeholder={isKm ? 'បញ្ចូលថ្នាក់រៀន' : 'Enter classroom'}
            value={formData.classroom}
            onChange={(e) => handleChange('classroom', e.target.value)}
            leftIcon={GraduationCap}
            error={errors.classroom}
            required
          />
        </div>

        {/* 5. Address (ទីលំនៅ) */}
        <Input
          id="reg-address"
          label={isKm ? 'ទីលំនៅបច្ចុប្បន្ន' : 'Current Address'}
          placeholder={isKm ? 'បញ្ចូលទីលំនៅបច្ចុប្បន្ន' : 'Enter current address'}
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          leftIcon={MapPin}
          error={errors.address}
          required
        />

        {/* 6. Email & Phone (អ៊ីម៉ែល និង លេខទូរស័ព្ទ) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="reg-email"
            label={isKm ? 'អ៊ីម៉ែល' : 'Email'}
            type="email"
            placeholder={isKm ? 'បញ្ចូលអ៊ីម៉ែល' : 'Enter email'}
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            leftIcon={Mail}
            error={errors.email}
            required
          />
          <Input
            id="reg-phone"
            label={isKm ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
            placeholder={isKm ? 'បញ្ចូលលេខទូរស័ព្ទ' : 'Enter phone number'}
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            leftIcon={Phone}
            error={errors.phone}
            required
          />
        </div>

        {/* 7. Telegram (Optional) */}
        <Input
          id="reg-telegram"
          label={isKm ? 'Telegram (មិនមានក៏បាន)' : 'Telegram (Optional)'}
          placeholder={isKm ? 'បញ្ចូលឈ្មោះគណនី Telegram' : 'Enter Telegram username'}
          value={formData.telegram}
          onChange={(e) => handleChange('telegram', e.target.value)}
          leftIcon={Send}
        />

        {/* 8. Password & Confirm Password (ពាក្យសម្ងាត់) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="reg-password"
            label={isKm ? 'ពាក្យសម្ងាត់' : 'Password'}
            type={showPassword ? 'text' : 'password'}
            placeholder={isKm ? 'យ៉ាងតិច ៦ ខ្ទង់' : 'At least 6 characters'}
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            leftIcon={Lock}
            error={errors.password}
            required
          />
          <Input
            id="reg-confirm-password"
            label={isKm ? 'ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់' : 'Confirm Password'}
            type={showPassword ? 'text' : 'password'}
            placeholder={isKm ? 'បញ្ចូលពាក្យសម្ងាត់ឡើងវិញ' : 'Re-enter password'}
            value={formData.confirm_password}
            onChange={(e) => handleChange('confirm_password', e.target.value)}
            leftIcon={Lock}
            error={errors.confirm_password}
            required
          />
        </div>

        {/* Show Password Toggle */}
        <div className="flex items-center justify-between pt-0.5 text-xs text-white/80">
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

        {/* Action Buttons */}
        <div className="pt-3 space-y-2.5">
          <button
            type="submit"
            disabled={isAuthLoading}
            className="w-full inline-flex items-center justify-center font-kh-body font-bold transition-colors duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/40 disabled:opacity-50 disabled:cursor-not-allowed bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] rounded-xl text-base px-5 py-2.5 gap-2.5 min-h-[46px]"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span className="truncate leading-relaxed tracking-wide">
              {isKm ? 'ចុះឈ្មោះប្រើប្រាស់' : 'Complete Registration'}
            </span>
          </button>

          <p className="text-center text-xs text-white/75">
            {isKm ? 'មានគណនីរួចហើយ?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-bold text-white hover:text-[#38BDF8] underline ml-1 cursor-pointer"
            >
              {isKm ? 'ចូលគណនី' : 'Sign in'}
            </button>
          </p>
        </div>
      </form>
      )}
    </Modal>
  );
}
