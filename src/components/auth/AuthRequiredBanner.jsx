import React from 'react';
import { ShieldAlert, UserPlus, LogIn } from 'lucide-react';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AuthRequiredBanner({ title, description, featureName }) {
  const { setIsRegisterOpen, setIsLoginOpen } = useAuth();
  const { language } = useLanguage();

  return (
    <div
      id="auth-required-banner"
      className="p-8 sm:p-12 bg-white/[0.05] rounded-3xl border border-white/10 text-center max-w-xl mx-auto my-6 space-y-6 font-kh-body"
    >
      <div className="h-14 w-14 bg-white/[0.08] rounded-2xl flex items-center justify-center text-[#38BDF8] mx-auto">
        <ShieldAlert className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <h3 className="font-kh-title text-xl sm:text-2xl text-white tracking-wide">
          {title ||
            (language === 'km'
              ? 'សូមចុះឈ្មោះ ឬ ចូលគណនីជាមុនសិន'
              : 'Sign In or Registration Required')}
        </h3>
        <p className="text-xs sm:text-sm text-white/75 leading-relaxed max-w-md mx-auto">
          {description ||
            (language === 'km'
              ? `ដើម្បីប្រើប្រាស់មុខងារ ${featureName ? `"${featureName}"` : 'នេះ'} និងគ្រប់គ្រងការរៀនសូត្រ សូមចុះឈ្មោះគណនីសិស្សជាមួយប័ណ្ណសម្គាល់ខ្លួន។`
              : `To access ${featureName ? `"${featureName}"` : 'this feature'}, please register or sign in with your Student ID.`)}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          variant="primary"
          size="md"
          leftIcon={UserPlus}
          onClick={() => setIsRegisterOpen(true)}
          className="w-full sm:w-auto"
        >
          {language === 'km' ? 'ចុះឈ្មោះប្រើប្រាស់' : 'Register Student'}
        </Button>
        <Button
          variant="outline"
          size="md"
          leftIcon={LogIn}
          onClick={() => setIsLoginOpen(true)}
          className="w-full sm:w-auto"
        >
          {language === 'km' ? 'ចូលគណនី' : 'Sign In'}
        </Button>
      </div>
    </div>
  );
}
