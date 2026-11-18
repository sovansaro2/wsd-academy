import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Library,
  Calculator,
  PenLine,
  MoreHorizontal,
  Search,
  History,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import LanguageToggle from '../common/LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import logoNameImg from '../../assets/logoname.png';

export default function TopNavbar() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { currentUser, isAuthenticated, isAdmin, setIsLoginOpen } = useAuth();
  const [navSearch, setNavSearch] = useState('');
  const [avatarImgError, setAvatarImgError] = useState(false);
  const isKm = language === 'km';

  useEffect(() => {
    setAvatarImgError(false);
  }, [currentUser?.avatar_url]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = navSearch.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
  };

  const navLinks = [
    { to: '/library', label: isKm ? 'បណ្ណាល័យ' : 'Library', icon: Library },
    { to: '/solver', label: isKm ? 'ដោះស្រាយលំហាត់' : 'Solver', icon: Calculator },
    { to: '/resource', label: isKm ? 'តែងសេចក្ដី' : 'Essays', icon: PenLine },
    { to: '/more', label: isKm ? 'ច្រើនទៀត' : 'More', icon: MoreHorizontal },
  ];

  const displayName = currentUser
    ? isKm
      ? `${currentUser.last_name || ''} ${currentUser.first_name || ''}`.trim() ||
        currentUser.student_id
      : `${currentUser.first_name_en || currentUser.first_name || ''} ${
          currentUser.last_name_en || currentUser.last_name || ''
        }`.trim() || currentUser.student_id
    : '';

  const avatarChar = (
    currentUser?.first_name_en ||
    currentUser?.first_name ||
    currentUser?.student_id ||
    'S'
  )
    .charAt(0)
    .toUpperCase();

  return (
    <header
      id="desktop-top-navbar"
      className="hidden md:block sticky top-0 z-40 w-full bg-[#153944]/95 backdrop-blur-md border-b border-white/10 font-kh-body select-none"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 lg:gap-4">
        {/* Left Zone: Brand Logo + Quick Search */}
        <div className="flex items-center gap-3 lg:gap-4 min-w-0 shrink-0">
          <Link
            to="/"
            className="flex items-center shrink-0 transition-opacity hover:opacity-90"
            aria-label={t('app.title')}
          >
            <img
              src={logoNameImg}
              alt={t('app.title')}
              className="h-10 w-auto object-contain select-none"
            />
          </Link>

          <form
            onSubmit={handleSearchSubmit}
            className="hidden lg:flex items-center bg-white/[0.08] hover:bg-white/[0.11] focus-within:bg-white/[0.12] border border-white/12 focus-within:border-[#38BDF8]/60 rounded-full px-3.5 py-1.5 w-52 xl:w-64 gap-2 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-white/55 shrink-0" />
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder={isKm ? 'ស្វែងរក...' : 'Search...'}
              aria-label={isKm ? 'ស្វែងរក' : 'Search'}
              className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-white/50 focus:outline-none"
            />
          </form>
        </div>

        {/* Center Zone: Clean Single-Line Nav Links */}
        <nav
          aria-label="Desktop Navigation"
          className="flex items-center gap-1 lg:gap-2 shrink-0"
        >
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-2 rounded-xl text-xs lg:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'text-[#38BDF8] bg-[#38BDF8]/12 font-semibold'
                      : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 opacity-85" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-2 rounded-xl text-xs lg:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'text-[#38BDF8] bg-[#38BDF8]/12 font-semibold'
                    : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
                }`
              }
            >
              <ShieldCheck className="w-4 h-4 shrink-0 opacity-85" />
              <span>{isKm ? 'គ្រប់គ្រង' : 'Admin'}</span>
            </NavLink>
          )}
        </nav>

        {/* Right Zone: History, Language, Account */}
        <div className="flex items-center gap-2.5 shrink-0">
          <NavLink
            to="/history"
            title={isKm ? 'ប្រវត្តិសិក្សា' : 'Study History'}
            aria-label={isKm ? 'ប្រវត្តិសិក្សា' : 'Study History'}
            className={({ isActive }) =>
              `w-9 h-9 rounded-xl inline-flex items-center justify-center transition-colors shrink-0 ${
                isActive
                  ? 'bg-[#38BDF8]/15 text-[#38BDF8]'
                  : 'text-white/75 hover:text-white hover:bg-white/[0.08]'
              }`
            }
          >
            <History className="w-4 h-4" />
          </NavLink>

          <LanguageToggle />

          {isAuthenticated ? (
            <NavLink
              to="/profile"
              title={displayName}
              className={({ isActive }) =>
                `inline-flex items-center gap-2.5 py-1 pl-1 pr-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 group ${
                  isActive
                    ? 'text-[#38BDF8]'
                    : 'text-white/90 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-8 h-8 rounded-full overflow-hidden inline-flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                      currentUser?.avatar_url && !avatarImgError
                        ? isActive
                          ? 'ring-2 ring-[#38BDF8]'
                          : 'ring-1 ring-white/25'
                        : isActive
                        ? 'bg-[#38BDF8] text-[#092731] ring-2 ring-white/30 font-bold text-xs'
                        : 'bg-[#38BDF8] text-[#092731] font-bold text-xs'
                    }`}
                  >
                    {currentUser?.avatar_url && !avatarImgError ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={displayName}
                        onError={() => setAvatarImgError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{avatarChar}</span>
                    )}
                  </span>
                  <span className="text-xs lg:text-sm font-medium max-w-[120px] truncate">
                    {displayName}
                  </span>
                </>
              )}
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>{isKm ? 'ចូលគណនី' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
