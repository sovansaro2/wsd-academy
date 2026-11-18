import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  User,
  Shield,
  IdCard,
  Mail,
  Phone,
  Send,
  MapPin,
  Calendar,
  GraduationCap,
  LogOut,
  UserPlus,
  LogIn,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Info,
  ChevronRight,
  ArrowLeft,
  Keyboard,
  Camera,
  Bookmark,
  Download,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DobPicker from '../components/common/DobPicker';
import ImageCropperModal from '../components/common/ImageCropperModal';
import SavedEssaysView from '../components/essay/SavedEssaysView';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getSavedEssays, hydrateSavedEssaysFromOfflineDB } from '../utils/savedEssays';
import { usePWAInstall } from '../hooks/usePWA';

export default function ProfilePage() {
  const { currentUser, isAuthenticated, logout, changePassword, updateProfile, setIsRegisterOpen, setIsLoginOpen } =
    useAuth();
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);

  const isKm = language === 'km';
  // Views: 'menu' (Default Account Screen) | 'profile' (ព័ត៌មានគណនីសិស្ស) | 'security' | 'about' | 'bookmark'
  const [currentView, setCurrentView] = useState(() => searchParams.get('view') || 'menu');
  const [savedEssayCount, setSavedEssayCount] = useState(() => getSavedEssays(currentUser).length);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  useEffect(() => {
    const viewParam = searchParams.get('view');
    setCurrentView(viewParam || 'menu');
  }, [searchParams]);

  useEffect(() => {
    const updateCount = () => setSavedEssayCount(getSavedEssays(currentUser).length);
    updateCount();
    hydrateSavedEssaysFromOfflineDB(currentUser).then((merged) => {
      if (Array.isArray(merged)) setSavedEssayCount(merged.length);
    });
    window.addEventListener('wsd:saved-essays-updated', updateCount);
    return () => window.removeEventListener('wsd:saved-essays-updated', updateCount);
  }, [currentUser]);

  const handleSelectView = (view) => {
    setCurrentView(view);
    if (view === 'menu') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ view }, { replace: true });
    }
  };

  // Change password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Phone Modal state
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);

  // Email Modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // Edit Profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    grade: '',
    classroom: '',
    address: '',
    telegram: '',
    avatar_url: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  const handleOpenEditProfile = () => {
    setProfileData({
      first_name: currentUser.first_name || '',
      last_name: currentUser.last_name || '',
      first_name_en: currentUser.first_name_en || '',
      last_name_en: currentUser.last_name_en || '',
      gender: currentUser.gender || '',
      date_of_birth: currentUser.date_of_birth || '',
      grade: currentUser.grade || '',
      classroom: currentUser.classroom || '',
      address: currentUser.address || '',
      telegram: currentUser.telegram || '',
      avatar_url: currentUser.avatar_url || '',
    });
    setIsEditingProfile(true);
  };

  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setIsSubmittingProfile(true);

    const result = await updateProfile({
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      first_name_en: profileData.first_name_en,
      last_name_en: profileData.last_name_en,
      gender: profileData.gender,
      date_of_birth: profileData.date_of_birth,
      grade: profileData.grade,
      classroom: profileData.classroom,
      address: profileData.address,
      telegram: profileData.telegram,
      avatar_url: profileData.avatar_url,
    });
    setIsSubmittingProfile(false);

    if (result.success) {
      setProfileSuccess(isKm ? 'ព័ត៌មានត្រូវបានកែប្រែដោយជោគជ័យ!' : 'Profile updated successfully!');
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileSuccess('');
      }, 1500);
    } else {
      setProfileError(result.error || (isKm ? 'ការកែប្រែព័ត៌មានមិនជោគជ័យ' : 'Profile update failed'));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword) {
      setPasswordError(isKm ? 'សូមបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន' : 'Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(isKm ? 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៦ តួអក្សរ' : 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(isKm ? 'ពាក្យសម្ងាត់ថ្មី និងការបញ្ជាក់មិនត្រូវគ្នាទេ' : 'New password and confirmation do not match');
      return;
    }

    setIsSubmittingPassword(true);
    const result = await changePassword(oldPassword, newPassword);
    setIsSubmittingPassword(false);

    if (result.success) {
      setPasswordSuccess(isKm ? 'បានផ្លាស់ប្ដូរពាក្យសម្ងាត់ដោយជោគជ័យ!' : 'Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess('');
      }, 2000);
    } else {
      setPasswordError(result.error || (isKm ? 'ការប្តូរពាក្យសម្ងាត់មិនជោគជ័យ' : 'Password change failed'));
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneSuccess('');
    
    if (!phone) {
      setPhoneError(isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទថ្មី' : 'Please enter new phone number');
      return;
    }

    setIsSubmittingPhone(true);
    const result = await updateProfile({ phone });
    setIsSubmittingPhone(false);

    if (result.success) {
      setPhoneSuccess(isKm ? 'លេខទូរស័ព្ទត្រូវបានកែប្រែដោយជោគជ័យ!' : 'Phone number updated successfully!');
      setTimeout(() => {
        setIsPhoneModalOpen(false);
        setPhoneSuccess('');
      }, 2000);
    } else {
      setPhoneError(result.error || (isKm ? 'ការកែប្រែលេខទូរស័ព្ទមិនជោគជ័យ' : 'Phone update failed'));
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    
    if (!email) {
      setEmailError(isKm ? 'សូមបញ្ចូលអ៊ីម៉ែលថ្មី' : 'Please enter new email');
      return;
    }

    setIsSubmittingEmail(true);
    const result = await updateProfile({ email });
    setIsSubmittingEmail(false);

    if (result.success) {
      setEmailSuccess(isKm ? 'អ៊ីម៉ែលត្រូវបានកែប្រែដោយជោគជ័យ!' : 'Email updated successfully!');
      setTimeout(() => {
        setIsEmailModalOpen(false);
        setEmailSuccess('');
      }, 2000);
    } else {
      setEmailError(result.error || (isKm ? 'ការកែប្រែអ៊ីម៉ែលមិនជោគជ័យ' : 'Email update failed'));
    }
  };

  // 1. UNREGISTERED / NOT LOGGED IN STATE
  if (!isAuthenticated || !currentUser) {
    return (
      <div id="profile-unregistered-view" className="space-y-6 font-kh-body">
        {/* Header */}
        <div className="pb-4 border-b border-white/10">
          <h1 className="font-kh-title text-2xl text-white tracking-wide">
            {isKm ? 'គណនីផ្ទាល់ខ្លួន' : 'Student Profile'}
          </h1>
          <p className="text-xs sm:text-sm text-white/75 mt-1">
            {isKm
              ? 'សូមចុះឈ្មោះដើម្បីគ្រប់គ្រងទិន្នន័យសិក្សា និងដោះស្រាយលំហាត់'
              : 'Please register to manage your learning progress and solve exercises'}
          </p>
        </div>

        {/* Clean Empty State */}
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-12 sm:p-20 text-center space-y-6 max-w-xl mx-auto my-8">
          <div className="h-20 w-20 rounded-full bg-white/[0.08] flex items-center justify-center text-[#38BDF8] mx-auto">
            <User className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h3 className="font-kh-title text-xl sm:text-2xl text-white">
              {isKm ? 'មិនទាន់មានគណនីនៅឡើយទេ' : 'No Account Registered Yet'}
            </h3>
            <p className="text-xs sm:text-sm text-white/75 max-w-md mx-auto leading-relaxed">
              {isKm
                ? 'អ្នកមិនទាន់បានចុះឈ្មោះគណនីសិស្សទេ។ សូមចុចប៊ូតុងខាងក្រោមដើម្បីចុះឈ្មោះប្រើប្រាស់។'
                : 'You have not registered an account yet. Please click the button below to register.'}
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              id="profile-register-btn"
              variant="primary"
              size="lg"
              leftIcon={UserPlus}
              onClick={() => setIsRegisterOpen(true)}
              className="w-full sm:w-auto px-8"
            >
              {isKm ? 'ចុះឈ្មោះប្រើប្រាស់' : 'Register Account'}
            </Button>

            <Button
              id="profile-login-btn"
              variant="outline"
              size="lg"
              leftIcon={LogIn}
              onClick={() => setIsLoginOpen(true)}
              className="w-full sm:w-auto"
            >
              {isKm ? 'ចូលគណនី' : 'Sign In'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED STATE
  const fullName = isKm
    ? `${currentUser.last_name || ''} ${currentUser.first_name || ''}`.trim() || 'WSD STUDENT'
    : `${currentUser.first_name_en || currentUser.first_name || ''} ${currentUser.last_name_en || currentUser.last_name || ''}`.trim() || 'WSD STUDENT';
  const initials = currentUser?.first_name
    ? currentUser.first_name.slice(0, 2).toUpperCase()
    : 'ST';

  // SUBPAGE 1: Profile Details (ព័ត៌មានគណនីសិស្ស)
  if (currentView === 'profile') {
    return (
      <motion.div
        key="profile"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        id="student-info-subpage"
        className="max-w-3xl mx-auto space-y-5 font-kh-body pb-10"
      >
        {/* Back navigation header */}
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <button
            type="button"
            id="back-to-account-btn"
            onClick={() => setCurrentView('menu')}
            className="inline-flex items-center gap-2 text-white hover:text-white/80 font-semibold text-sm transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isKm ? 'ត្រឡប់ក្រោយ' : 'Back to Account'}</span>
          </button>
        </div>

        {/* Detailed Student Identity Card */}
        <Card
          title={<span className={`uppercase font-bold tracking-wider ${isKm ? 'font-kh-title text-base' : 'font-rajdhani text-lg'}`}>{isKm ? 'ព័ត៌មានគណនីសិស្ស' : 'Student Profile Details'}</span>}
          subtitle={
            isKm
              ? 'ទិន្នន័យសម្គាល់ខ្លួនសិស្សផ្លូវការក្នុងប្រព័ន្ធ WSD Academy'
              : 'Official student identity records in WSD Academy platform'
          }
        >
          {/* Avatar Display */}
          <div className="flex justify-center mb-6 mt-2">
            <div className="h-24 w-24 rounded-full bg-white/[0.08] shadow-md flex items-center justify-center font-bold text-3xl text-white overflow-hidden">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-kh-body font-bold text-2xl">{initials}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Student ID */}
            <div className="p-3.5 bg-white/[0.04] rounded-xl">
              <div className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5 text-white/85" />
                <span>{isKm ? 'លេខសម្គាល់សិស្ស' : 'Student ID'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1 font-rajdhani">
                {currentUser.student_id}
              </div>
            </div>

            {/* Full Name */}
            <div className="p-3.5 bg-white/[0.04] rounded-xl">
              <div className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-white/85" />
                <span>{isKm ? 'គោត្តនាម និង នាម' : 'Full Name'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {fullName}
              </div>
            </div>

            {/* Gender */}
            <div className="p-3.5 bg-white/[0.04] rounded-xl">
              <div className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-white/85" />
                <span>{isKm ? 'ភេទ' : 'Gender'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {currentUser.gender || (isKm ? 'ប្រុស' : 'Male')}
              </div>
            </div>

            {/* Date of Birth */}
            <div className="p-3.5 bg-white/[0.04] rounded-xl">
              <div className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-white/85" />
                <span>{isKm ? 'ថ្ងៃខែឆ្នាំកំណើត' : 'Date of Birth'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {currentUser.date_of_birth || 'N/A'}
              </div>
            </div>

            {/* Grade */}
            <div className="p-3.5 bg-white/[0.04] rounded-xl">
              <div className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-white/85" />
                <span>{isKm ? 'កម្រិតសិក្សា' : 'Grade Level'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {currentUser.grade || (isKm ? 'ទី១២' : 'Grade 12')}
              </div>
            </div>

            {/* Classroom */}
            <div className="p-3.5 bg-white/[0.04] rounded-xl">
              <div className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-white/85" />
                <span>{isKm ? 'ថ្នាក់រៀន' : 'Classroom'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {currentUser.classroom || '12A'}
              </div>
            </div>

            {/* Address */}
            <div className="p-3.5 bg-white/[0.04] rounded-xl sm:col-span-2">
              <div className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-white/85" />
                <span>{isKm ? 'ទីលំនៅបច្ចុប្បន្ន' : 'Current Address'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {currentUser.address || 'N/A'}
              </div>
            </div>

            {/* Email */}
            <div className="p-3.5 bg-white/[0.04] rounded-xl">
              <div className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-white/85" />
                <span>{isKm ? 'អ៊ីម៉ែល' : 'Email'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1 truncate">
                {currentUser.email}
              </div>
            </div>

            {/* Phone */}
            <div className="p-3.5 bg-white/[0.04] rounded-xl">
              <div className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-white/85" />
                <span>{isKm ? 'លេខទូរស័ព្ទ' : 'Phone Number'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {currentUser.phone}
              </div>
            </div>

            {/* Telegram */}
            <div className="p-3.5 bg-white/[0.04] rounded-xl sm:col-span-2">
              <div className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-white/85" />
                <span>{isKm ? 'Telegram' : 'Telegram'}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {currentUser.telegram || (isKm ? 'មិនមាន' : 'None')}
              </div>
            </div>
            
            {/* Edit Button */}
            <div className="sm:col-span-2 pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleOpenEditProfile}
                className="px-6 py-2.5 bg-white/[0.08] text-white hover:bg-white/15 font-bold rounded-full transition cursor-pointer text-sm"
              >
                {isKm ? 'កែប្រែព័ត៌មាន' : 'Edit Profile'}
              </button>
            </div>
          </div>
        </Card>

        {/* Edit Profile Modal */}
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div className="bg-[#194350] rounded-2xl shadow-xl border border-white/15 w-full max-w-[600px] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-[#194350] border-b border-white/10 px-5 py-3.5 flex justify-between items-center text-white z-10">
                <h3 className="font-semibold text-lg">{isKm ? 'កែប្រែព័ត៌មាន' : 'Edit Profile'}</h3>
                <button onClick={() => setIsEditingProfile(false)} className="text-white/75 hover:text-white transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="px-6 py-5">
                <form onSubmit={handleEditProfileSubmit} className="space-y-4">
                  {profileError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200 flex items-start gap-2 mb-4">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-rose-300" />
                      <span>{profileError}</span>
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-xs text-emerald-200 flex items-start gap-2 mb-4">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-300" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center justify-center pb-2">
                    <div className="relative group cursor-pointer" onClick={() => setIsCropModalOpen(true)}>
                      <div className="h-20 w-20 rounded-full bg-white/[0.08] shadow-sm flex items-center justify-center font-bold text-2xl text-white overflow-hidden">
                        {profileData.avatar_url ? (
                          <img
                            src={profileData.avatar_url}
                            alt="Avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-kh-body font-bold text-xl">{initials}</span>
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 bg-[#092731] p-1.5 rounded-full shadow text-white transition-colors">
                        <Camera className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white">{isKm ? 'នាមត្រកូល (Last Name)' : 'Last Name (Khmer)'}</label>
                      <input
                        type="text"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white">{isKm ? 'នាមខ្លួន (First Name)' : 'First Name (Khmer)'}</label>
                      <input
                        type="text"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white">{isKm ? 'នាមត្រកូល (ឡាតាំង)' : 'Last Name (Latin)'}</label>
                      <input
                        type="text"
                        value={profileData.last_name_en}
                        onChange={(e) => setProfileData({...profileData, last_name_en: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white font-en focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white">{isKm ? 'នាមខ្លួន (ឡាតាំង)' : 'First Name (Latin)'}</label>
                      <input
                        type="text"
                        value={profileData.first_name_en}
                        onChange={(e) => setProfileData({...profileData, first_name_en: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white font-en focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white">{isKm ? 'ភេទ (Gender)' : 'Gender'}</label>
                      <select
                        value={profileData.gender}
                        onChange={(e) => setProfileData({...profileData, gender: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white [&_option]:bg-[#194350] [&_option]:text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition"
                      >
                        <option value="">{isKm ? 'ជ្រើសរើស' : 'Select'}</option>
                        <option value={isKm ? 'ប្រុស' : 'Male'}>{isKm ? 'ប្រុស' : 'Male'}</option>
                        <option value={isKm ? 'ស្រី' : 'Female'}>{isKm ? 'ស្រី' : 'Female'}</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1 relative z-50">
                      <DobPicker
                        id="edit-profile-dob"
                        label={isKm ? 'ថ្ងៃខែឆ្នាំកំណើត (DOB)' : 'Date of Birth'}
                        value={profileData.date_of_birth}
                        onChange={(dateStr) => setProfileData({...profileData, date_of_birth: dateStr})}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white">{isKm ? 'កម្រិតសិក្សា (Grade)' : 'Grade'}</label>
                      <input
                        type="text"
                        value={profileData.grade}
                        onChange={(e) => setProfileData({...profileData, grade: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white">{isKm ? 'ថ្នាក់រៀន (Classroom)' : 'Classroom'}</label>
                      <input
                        type="text"
                        value={profileData.classroom}
                        onChange={(e) => setProfileData({...profileData, classroom: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition"
                      />
                    </div>
                    
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-white">{isKm ? 'ទីលំនៅ (Address)' : 'Address'}</label>
                      <input
                        type="text"
                        value={profileData.address}
                        onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition"
                      />
                    </div>
                    
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-white">Telegram Username</label>
                      <input
                        type="text"
                        value={profileData.telegram}
                        onChange={(e) => setProfileData({...profileData, telegram: e.target.value})}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition"
                        placeholder="@username"
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white/[0.05] rounded-xl">
                    <p className="text-xs text-white/85 flex items-center gap-2">
                      <Info className="h-4 w-4 shrink-0 text-[#38BDF8]" />
                      {isKm 
                        ? 'បញ្ជាក់៖ អ៊ីម៉ែល និងលេខទូរស័ព្ទមិនអាចកែប្រែនៅទីនេះបានទេ។ សូមចូលទៅកាន់ "ពាក្យសម្ងាត់ និងសុវត្ថិភាព" ដើម្បីកែប្រែ។'
                        : 'Note: Email and Phone Number cannot be edited here. Please go to "Password & Security" to change them.'}
                    </p>
                  </div>

                  <div className="pt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-6 py-2.5 bg-white/[0.07] text-white hover:bg-white/15 font-bold rounded-full transition cursor-pointer text-sm"
                    >
                      {isKm ? 'បោះបង់' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingProfile}
                      className="px-6 py-2.5 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] font-bold rounded-full transition disabled:opacity-50 uppercase text-sm tracking-wide cursor-pointer"
                    >
                      {isSubmittingProfile ? '...' : (isKm ? 'រក្សាទុក' : 'Save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        <ImageCropperModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          onSave={(croppedImage) => {
            setProfileData({ ...profileData, avatar_url: croppedImage });
            setIsCropModalOpen(false);
          }}
        />
      </motion.div>
    );
  }

  // SUBPAGE 2: Password and Security
  if (currentView === 'security') {
    return (
      <motion.div
        key="security"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        id="security-subpage"
        className="max-w-xl mx-auto space-y-5 font-kh-body pb-10"
      >
        {/* Back navigation header */}
        <div className="pb-3 border-b border-white/10">
          <button
            type="button"
            id="back-to-account-from-sec-btn"
            onClick={() => setCurrentView('menu')}
            className="inline-flex items-center gap-2 text-white hover:text-white/80 font-semibold text-sm transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isKm ? 'ត្រឡប់ក្រោយ' : 'Back to Account'}</span>
          </button>
        </div>

        <div className="bg-white/[0.05] border border-white/10 rounded-2xl overflow-hidden relative">
          <div className="py-4 text-center border-b border-white/10 font-bold text-lg text-white tracking-wide">
            {isKm ? 'ពាក្យសម្ងាត់ និងសុវត្ថិភាព' : 'Password & Security'}
          </div>
          
          <div className="px-5">
            {/* Password Row */}
            <div className="py-4 border-b border-white/10">
              <div className="flex items-center text-sm mb-1">
                <span className="text-[#38BDF8] mr-2">*</span>
                <span className="text-white font-medium">{isKm ? 'ពាក្យសម្ងាត់' : 'Password'}</span>
                <button onClick={() => setIsPasswordModalOpen(true)} className="text-[#38BDF8] hover:text-[#56CAF9] hover:underline ml-3 font-semibold transition cursor-pointer">{isKm ? 'ប្តូរ' : 'change'}</button>
              </div>
              <p className="text-white/75 text-sm pl-4">
                {isKm 
                  ? 'យើងសូមណែនាំឱ្យប្រើប្រាស់ពាក្យសម្ងាត់ដែលមានសុវត្ថិភាព ដែលអ្នកមិនប្រើនៅកន្លែងផ្សេង។' 
                  : "We recommend using a secure password that you don't use anywhere else."}
              </p>
            </div>

            {/* Phone Number Row */}
            <div className="py-4 border-b border-white/10">
              <div className="flex items-center text-sm mb-1">
                <span className="text-[#38BDF8] mr-2">*</span>
                <span className="text-white font-medium">{isKm ? 'លេខទូរស័ព្ទ' : 'Phone Number'}</span>
                <button onClick={() => { setPhone(currentUser.phone || ''); setIsPhoneModalOpen(true); }} className="text-[#38BDF8] hover:text-[#56CAF9] hover:underline ml-3 font-semibold transition cursor-pointer">{isKm ? 'ប្តូរ' : 'change'}</button>
              </div>
              <p className="text-white/75 text-sm pl-4">{currentUser.phone || 'N/A'}</p>
            </div>

            {/* Email Row */}
            <div className="py-4 pb-5">
              <div className="flex items-center text-sm mb-1">
                <span className="text-[#38BDF8] mr-2">*</span>
                <span className="text-white font-medium">{isKm ? 'អ៊ីម៉ែល' : 'Email'}</span>
                <button onClick={() => { setEmail(currentUser.email || ''); setIsEmailModalOpen(true); }} className="text-[#38BDF8] hover:text-[#56CAF9] hover:underline ml-3 font-semibold transition cursor-pointer">{isKm ? 'ប្តូរ' : 'change'}</button>
              </div>
              <p className="text-white/75 text-sm pl-4">{currentUser.email || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div className="bg-[#194350] rounded-2xl shadow-xl border border-white/15 w-full max-w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-[#194350] border-b border-white/10 px-5 py-3.5 flex justify-between items-center text-white">
                <h3 className="font-semibold text-lg">{isKm ? 'ប្តូរពាក្យសម្ងាត់' : 'Change Password'}</h3>
                <button onClick={() => setIsPasswordModalOpen(false)} className="text-white/75 hover:text-white transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-5">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {passwordError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200 flex items-start gap-2 mb-4">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-rose-300" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-xs text-emerald-200 flex items-start gap-2 mb-4">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-300" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  {/* Current Password */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-xs sm:text-sm font-medium text-white/80 shrink-0">
                      {isKm ? 'ពាក្យសម្ងាត់បច្ចុប្បន្ន' : 'Current Password'}
                    </label>
                    <div className="relative flex-1">
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder={isKm ? 'ពាក្យសម្ងាត់បច្ចុប្បន្ន' : 'Current Password'}
                        required
                        className="w-full pl-3 pr-16 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition placeholder:text-white/40"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/60">
                        <Keyboard className="h-4 w-4" />
                        <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="hover:text-white cursor-pointer">
                          {showOldPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-xs sm:text-sm font-medium text-white/80 shrink-0">
                      {isKm ? 'ពាក្យសម្ងាត់ថ្មី' : 'New Password'}
                    </label>
                    <div className="relative flex-1">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={isKm ? 'ពាក្យសម្ងាត់ថ្មី' : 'New Password'}
                        required
                        className="w-full pl-3 pr-16 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition placeholder:text-white/40"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/60">
                        <Keyboard className="h-4 w-4" />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="hover:text-white cursor-pointer">
                          {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-xs sm:text-sm font-medium text-white/80 shrink-0 leading-tight">
                      {isKm ? 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី' : 'Confirm New Password'}
                    </label>
                    <div className="relative flex-1">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={isKm ? 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី' : 'Confirm New Password'}
                        required
                        className="w-full pl-3 pr-16 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition placeholder:text-white/40"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/60">
                        <Keyboard className="h-4 w-4" />
                        <button type="button" className="hover:text-white cursor-default">
                          <EyeOff className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingPassword}
                      className="px-6 py-2.5 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] font-bold rounded-full transition disabled:opacity-50 uppercase text-sm tracking-wide cursor-pointer"
                    >
                      {isSubmittingPassword ? '...' : (isKm ? 'បញ្ជូន' : 'Submit')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Change Phone Modal */}
        {isPhoneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div className="bg-[#194350] rounded-2xl shadow-xl border border-white/15 w-full max-w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-[#194350] border-b border-white/10 px-5 py-3.5 flex justify-between items-center text-white">
                <h3 className="font-semibold text-lg">{isKm ? 'ប្តូរលេខទូរស័ព្ទ' : 'Change Phone Number'}</h3>
                <button onClick={() => setIsPhoneModalOpen(false)} className="text-white/75 hover:text-white transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="px-6 py-5">
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  {phoneError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200 flex items-start gap-2 mb-4">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-rose-300" />
                      <span>{phoneError}</span>
                    </div>
                  )}
                  {phoneSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-xs text-emerald-200 flex items-start gap-2 mb-4">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-300" />
                      <span>{phoneSuccess}</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-xs sm:text-sm font-medium text-white/80 shrink-0">
                      {isKm ? 'លេខទូរស័ព្ទថ្មី' : 'New Phone Number'}
                    </label>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={isKm ? 'លេខទូរស័ព្ទថ្មី' : 'New Phone Number'}
                        required
                        className="w-full pl-3 pr-4 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition placeholder:text-white/40"
                      />
                    </div>
                  </div>
                  <div className="pt-5 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingPhone}
                      className="px-6 py-2.5 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] font-bold rounded-full transition disabled:opacity-50 uppercase text-sm tracking-wide cursor-pointer"
                    >
                      {isSubmittingPhone ? '...' : (isKm ? 'បញ្ជូន' : 'Submit')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Change Email Modal */}
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div className="bg-[#194350] rounded-2xl shadow-xl border border-white/15 w-full max-w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-[#194350] border-b border-white/10 px-5 py-3.5 flex justify-between items-center text-white">
                <h3 className="font-semibold text-lg">{isKm ? 'ប្តូរអ៊ីម៉ែល' : 'Change Email'}</h3>
                <button onClick={() => setIsEmailModalOpen(false)} className="text-white/75 hover:text-white transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="px-6 py-5">
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {emailError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200 flex items-start gap-2 mb-4">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-rose-300" />
                      <span>{emailError}</span>
                    </div>
                  )}
                  {emailSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-xs text-emerald-200 flex items-start gap-2 mb-4">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-300" />
                      <span>{emailSuccess}</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-xs sm:text-sm font-medium text-white/80 shrink-0">
                      {isKm ? 'អ៊ីម៉ែលថ្មី' : 'New Email'}
                    </label>
                    <div className="relative flex-1">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={isKm ? 'អ៊ីម៉ែលថ្មី' : 'New Email'}
                        required
                        className="w-full pl-3 pr-4 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition placeholder:text-white/40"
                      />
                    </div>
                  </div>
                  <div className="pt-5 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingEmail}
                      className="px-6 py-2.5 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] font-bold rounded-full transition disabled:opacity-50 uppercase text-sm tracking-wide cursor-pointer"
                    >
                      {isSubmittingEmail ? '...' : (isKm ? 'បញ្ជូន' : 'Submit')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </motion.div>
    );
  }

  // SUBPAGE 3: About
  if (currentView === 'about') {
    return (
      <motion.div
        key="about"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        id="about-subpage"
        className="max-w-xl mx-auto space-y-5 font-kh-body pb-10"
      >
        {/* Back navigation header */}
        <div className="pb-3 border-b border-white/10">
          <button
            type="button"
            id="back-to-account-from-about-btn"
            onClick={() => setCurrentView('menu')}
            className="inline-flex items-center gap-2 text-white hover:text-white/80 font-semibold text-sm transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isKm ? 'ត្រឡប់ក្រោយ' : 'Back to Account'}</span>
          </button>
        </div>

        <Card
          title={isKm ? 'អំពី WSD Academy' : 'About WSD Academy'}
          subtitle={
            isKm
              ? 'ថ្នាលអប់រំឌីជីថលសម្រាប់សិស្សានុសិស្សកម្ពុជា'
              : 'Digital learning platform for Cambodian high school students'
          }
        >
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white/[0.04] flex flex-col sm:flex-row items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/[0.08] text-[#38BDF8] font-bold text-lg flex items-center justify-center shrink-0 font-rajdhani tracking-wider">
                WSD
              </div>
              <div>
                <h3 className="font-rajdhani font-bold text-lg text-white uppercase">
                  WSD Academy
                </h3>
                <p className="text-xs text-white/80 mt-1 leading-relaxed">
                  {isKm
                    ? 'កម្មវិធីជំនួយការដោះស្រាយលំហាត់ និងចែករំលែកវិញ្ញាសា រូបមន្ត គណិតវិទ្យា-វិទ្យាសាស្ត្រ កម្រិតថ្នាក់ទី១២ សម្រាប់ត្រៀមប្រឡងបាក់ឌុប។'
                    : 'A dedicated problem-solving assistant and STEM resource hub for Grade 12 students preparing for the National Examination.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white">
              <div className="p-3.5 bg-white/[0.04] rounded-xl space-y-1">
                <div className="font-bold text-white">
                  {isKm ? 'កំណែប្រែ (Version)' : 'Version'}
                </div>
                <div className="text-white/75 font-rajdhani">v1.0.0 (Production)</div>
              </div>

              <div className="p-3.5 bg-white/[0.04] rounded-xl space-y-1">
                <div className="font-bold text-white">
                  {isKm ? 'ការគាំទ្រ និងទំនាក់ទំនង' : 'Support'}
                </div>
                <div className="text-white font-semibold font-rajdhani text-[11px] truncate">wsd.academy.26@gmail.com</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // SUBPAGE 4: Bookmark (រក្សាទុក)
  if (currentView === 'bookmark') {
    return (
      <motion.div
        key="bookmark"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <SavedEssaysView
          currentUser={currentUser}
          isKm={isKm}
          onBack={() => handleSelectView('menu')}
        />
      </motion.div>
    );
  }

  // 3. DEFAULT ROOT VIEW: CLEAN ACCOUNT MENU CARD ONLY
  return (
    <motion.div
      key="menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      id="account-main-menu-view"
      className={`max-w-md mx-auto py-2 sm:py-4 select-none ${
        isKm ? 'font-kh-body' : 'font-rajdhani'
      }`}
    >
      <div
        id="account-main-card"
        className="bg-white/[0.05] border border-white/10 rounded-2xl space-y-2 px-3 sm:px-4 py-3.5"
      >
        {/* Top User Profile Identity */}
        <div className="flex items-center gap-5 pt-1 pb-2">
          <div className="h-20 w-20 rounded-full bg-white/[0.08] shadow-sm flex items-center justify-center font-bold text-2xl text-white shrink-0 overflow-hidden">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-kh-body font-bold text-2xl">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-white text-lg uppercase truncate leading-tight tracking-wide font-kh-body">
              {fullName}
            </h2>
            <p className="text-xs text-white/70 font-rajdhani mt-1 tracking-wider uppercase font-medium">
              MY ID: {currentUser.student_id}
            </p>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-white/10" />

        {/* Section: Account */}
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-white/80 px-3 py-1 tracking-wide">
            {isKm ? 'គណនី:' : 'Account:'}
          </div>

          {/* 1. Profile -> Opens ព័ត៌មានគណនីសិស្ស page */}
          <button
            type="button"
            id="account-open-profile-btn"
            onClick={() => setCurrentView('profile')}
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition cursor-pointer group tracking-wide"
          >
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-white/70 group-hover:text-white transition" />
              <span className="group-hover:text-white transition-colors">{isKm ? 'ព័ត៌មានគណនី' : 'Profile'}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-white/55 group-hover:text-white transition" />
          </button>

          {/* 2. Password and Security -> Opens ផ្លាស់ប្ដូរពាក្យសម្ងាត់ page */}
          <button
            type="button"
            id="account-open-security-btn"
            onClick={() => setCurrentView('security')}
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition cursor-pointer group tracking-wide"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-white/70 group-hover:text-white transition" />
              <span>{isKm ? 'ពាក្យសម្ងាត់ និងសុវត្ថិភាព' : 'Password and Security'}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-white/55 group-hover:text-white transition" />
          </button>

        </div>

        {/* Divider */}
        <hr className="border-white/10" />

        {/* Section: General */}
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-white/80 px-3 py-1 tracking-wide">
            {isKm ? 'ទូទៅ:' : 'General:'}
          </div>

          <button
            type="button"
            id="account-open-bookmark-btn"
            onClick={() => handleSelectView('bookmark')}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition cursor-pointer group tracking-wide"
          >
            <div className="flex items-center gap-3">
              <Bookmark className="h-5 w-5 text-white/70 group-hover:text-white transition" />
              <span className="group-hover:text-white transition-colors">{isKm ? 'រក្សាទុក' : 'Bookmark'}</span>
            </div>
            <div className="flex items-center gap-2">
              {savedEssayCount > 0 && (
                <span className="text-xs text-white/70 tabular-nums font-normal">
                  {savedEssayCount}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-white/55 group-hover:text-white transition" />
            </div>
          </button>

          {!isInstalled && (isInstallable || isIOS) && (
            <button
              type="button"
              id="account-install-pwa-btn"
              onClick={() => {
                if (isInstallable) {
                  install();
                } else if (isIOS) {
                  setShowIOSInstallGuide(true);
                }
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition cursor-pointer group tracking-wide"
            >
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-white/70 group-hover:text-white transition" />
                <span className="group-hover:text-white transition-colors">
                  {isKm ? 'ដំឡើងកម្មវិធី Offline' : 'Install App (Offline)'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-white/55 group-hover:text-white transition" />
            </button>
          )}
        </div>

        {/* Divider */}
        <hr className="border-white/10" />

        {/* Section: Contact */}
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white/80 px-3 py-1 tracking-wide">
            {isKm ? 'ទំនាក់ទំនង:' : 'Contact:'}
          </div>

          {/* 3. Telegram */}
          <div className="flex items-center justify-between px-3 py-1.5 text-sm font-medium text-white tracking-wide">
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-white/70" />
              <span>{isKm ? 'តេឡេក្រាម' : 'Telegram'}</span>
            </div>
            <a
              href="https://t.me/sovansaro"
              target="_blank"
              rel="noopener noreferrer"
              id="account-contact-telegram-link"
              className="text-[#38BDF8] hover:text-[#38BDF8]/80 font-semibold text-[13px] hover:underline flex items-center gap-1 cursor-pointer tracking-wide"
            >
              {isKm ? 'ផ្ញើសារ' : 'Send'}
            </a>
          </div>

          {/* 4. Email */}
          <div className="flex items-center justify-between px-3 py-1.5 text-sm font-medium text-white tracking-wide">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-white/70" />
              <span>{isKm ? 'អ៊ីម៉ែល' : 'Email'}</span>
            </div>
            <a
              href="mailto:wsd.academy.26@gmail.com"
              id="account-contact-email-link"
              className="text-[#38BDF8] hover:text-[#38BDF8]/80 font-semibold text-[13px] hover:underline flex items-center gap-1 cursor-pointer tracking-wide"
            >
              {isKm ? 'ផ្ញើសារ' : 'Send'}
            </a>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-white/10" />

        {/* Section: About & Sign Out */}
        <div className="space-y-1 pt-1">
          {/* 6. About */}
          <button
            type="button"
            id="account-open-about-btn"
            onClick={() => setCurrentView('about')}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition cursor-pointer group tracking-wide"
          >
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-white/70 group-hover:text-white transition" />
              <span className="group-hover:text-white transition-colors">{isKm ? 'អំពី WSD Academy' : 'About'}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-white/55 group-hover:text-white transition" />
          </button>

          {/* 7. Sign Out */}
          <button
            type="button"
            id="account-logout-btn"
            onClick={logout}
            className="w-full flex items-center px-3 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-500/15 rounded-xl transition cursor-pointer text-left tracking-wide gap-3"
          >
            <LogOut className="h-5 w-5" />
            <span>{isKm ? 'ចាកចេញ' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      <ImageCropperModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onSave={(croppedImage) => {
          setProfileData({ ...profileData, avatar_url: croppedImage });
          setIsCropModalOpen(false);
        }}
      />

      {showIOSInstallGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-kh-body"
          onClick={() => setShowIOSInstallGuide(false)}
        >
          <div
            className="bg-[#194350] border border-white/15 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-kh-title text-base text-white">
              {isKm ? 'ដំឡើងលើ iPhone / iPad' : 'Install on iOS'}
            </h3>
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
              {isKm
                ? '១. ចុចប៊ូតុង Share នៅខាងក្រោម Safari\n២. រើស «Add to Home Screen»'
                : '1. Tap Share in Safari.\n2. Tap Add to Home Screen.'}
            </p>
            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(false)}
              className="w-full py-2.5 bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs font-bold rounded-xl cursor-pointer transition"
            >
              {isKm ? 'បិទ' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

