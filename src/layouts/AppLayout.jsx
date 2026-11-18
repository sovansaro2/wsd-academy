import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import logoNameImg from '../assets/logoname.png';
import RegisterModal from '../components/auth/RegisterModal';
import LoginModal from '../components/auth/LoginModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/usePWA';

export default function AppLayout() {
  const { t, language } = useLanguage();
  const isKm = language === 'km';
  const isOnline = useOnlineStatus();
  const {
    isRegisterOpen,
    setIsRegisterOpen,
    isLoginOpen,
    setIsLoginOpen,
  } = useAuth();

  return (
    <div className="min-h-screen bg-[#194350] text-white flex flex-col md:flex-row antialiased">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header with Logo Name */}
        <header
          id="mobile-top-header"
          className="md:hidden sticky top-0 z-30 bg-[#194350]/95 backdrop-blur-sm border-b border-white/10 px-4 py-2 flex items-center"
        >
          <Link to="/" className="flex items-center">
            <img
              src={logoNameImg}
              alt={t('app.title')}
              className="h-9 w-auto object-contain select-none"
            />
          </Link>
        </header>

        {!isOnline && (
          <div className="bg-white/[0.06] border-b border-white/10 px-4 py-2 flex items-center justify-between gap-3 text-xs text-white font-kh-body">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <WifiOff className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span>{isKm ? 'Offline · មើលទិន្នន័យរក្សាទុកបាន' : 'Offline · Saved items available'}</span>
            </span>
            <Link
              to="/profile?view=bookmark"
              className="font-semibold text-white hover:underline whitespace-nowrap shrink-0"
            >
              {isKm ? 'បើក រក្សាទុក' : 'Open Saved'}
            </Link>
          </div>
        )}

        {/* Dynamic Page Outlet */}
        <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Auth Modals */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />
    </div>
  );
}
