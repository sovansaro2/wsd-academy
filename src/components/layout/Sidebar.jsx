import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, LayoutGroup } from 'motion/react';
import {
  Home,
  Calculator,
  PenLine,
  Library,
  User,
  History,
  ShieldCheck,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from '../common/LanguageToggle';
import logoNameImg from '../../assets/logoname.png';

export const navItems = [
  { path: '/', key: 'home', icon: Home },
  { path: '/solver', key: 'solver', icon: Calculator },
  { path: '/resource', key: 'resource', icon: PenLine },
  { path: '/search', key: 'search', icon: Search },
  { path: '/library', key: 'library', icon: Library },
  { path: '/more', key: 'more', icon: MoreHorizontal },
  { path: '/profile', key: 'profile', icon: User },
  { path: '/admin', key: 'admin', icon: ShieldCheck },
];

// Main 5 navigation items for bottom bar
export const mainBottomNavItems = [
  { path: '/', key: 'home', icon: Home },
  { path: '/search', key: 'search', icon: Search },
  { path: '/library', key: 'library', icon: Library },
  { path: '/more', key: 'more', icon: MoreHorizontal },
  { path: '/profile', key: 'profile', icon: User },
];

export default function Sidebar() {
  const { t } = useLanguage();

  return (
    <aside
      id="desktop-sidebar"
      className="hidden md:flex flex-col w-64 bg-transparent border-r border-white/10 shrink-0 h-screen sticky top-0 z-30 font-kh-body select-none"
    >
      {/* Brand Header */}
      <div className="py-3.5 px-5 border-b border-white/10 flex items-center justify-center">
        <Link to="/" className="flex items-center justify-center transition-transform duration-200 hover:scale-[1.02]">
          <img
            src={logoNameImg}
            alt={t('app.title')}
            className="h-12 w-auto object-contain select-none"
          />
        </Link>
      </div>

      {/* Navigation Links - Clean tonal highlight with smooth sliding indicator */}
      <LayoutGroup id="desktop-sidebar">
        <motion.div
          layoutScroll
          className="flex-1 py-3 px-3 overflow-y-auto space-y-1"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const label = t(`nav.${item.key}`);

            return (
              <NavLink
                key={item.path}
                id={`sidebar-link-${item.key}`}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `relative w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left transition-colors duration-200 ease-out ${
                    isActive
                      ? 'text-[#38BDF8] font-semibold'
                      : 'text-white/70 font-medium hover:text-white hover:bg-white/[0.06]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-bg"
                        transition={{
                          type: 'spring',
                          stiffness: 320,
                          damping: 30,
                          mass: 0.75,
                        }}
                        className="absolute inset-0 rounded-xl bg-[#38BDF8]/15"
                      />
                    )}
                    <Icon
                      className={`relative z-10 h-5 w-5 shrink-0 transition-colors duration-200 ${
                        isActive ? 'text-[#38BDF8]' : 'text-white/60'
                      }`}
                    />
                    <span className="relative z-10 truncate text-[15px] leading-relaxed">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </motion.div>
      </LayoutGroup>

      {/* Footer Controls: Language Switcher + History Button */}
      <div className="p-3.5 border-t border-white/10 flex items-center justify-between gap-2">
        <NavLink
          to="/history"
          id="sidebar-footer-history-btn"
          title={t('nav.history')}
          aria-label={t('nav.history')}
          className={({ isActive }) =>
            `flex-1 py-2 px-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer ${
              isActive
                ? 'bg-[#38BDF8]/15 text-[#38BDF8]'
                : 'bg-white/[0.07] text-white/85 hover:bg-white/12 hover:text-white'
            }`
          }
        >
          <History className="h-4 w-4 shrink-0" />
          <span className="truncate">{t('nav.history')}</span>
        </NavLink>
        <div className="shrink-0">
          <LanguageToggle />
        </div>
      </div>
    </aside>
  );
}
