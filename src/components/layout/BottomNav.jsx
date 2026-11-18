import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, LayoutGroup } from 'motion/react';
import { mainBottomNavItems } from './Sidebar';
import { useLanguage } from '../../context/LanguageContext';

export default function BottomNav() {
  const { t } = useLanguage();

  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#194350]/95 backdrop-blur-md transform-gpu border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
    >
      <LayoutGroup id="bottom-nav">
        <div className="grid grid-cols-5 items-center px-1 py-1.5 max-w-md mx-auto">
          {mainBottomNavItems.map((item) => {
            const Icon = item.icon;
            const label = t(`nav.${item.key}`);

            return (
              <NavLink
                key={item.path}
                id={`bottom-nav-${item.key}`}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1 px-0.5 rounded-xl font-kh-body transition-colors duration-200 select-none min-h-[48px] relative ${
                    isActive
                      ? 'text-[#38BDF8] font-bold'
                      : 'text-white/55 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="relative p-1 rounded-xl flex items-center justify-center">
                      {isActive && (
                        <motion.span
                          layoutId="bottom-nav-active-pill"
                          transition={{
                            type: 'spring',
                            stiffness: 320,
                            damping: 28,
                            mass: 0.75,
                          }}
                          className="absolute inset-0 rounded-xl bg-[#38BDF8]/15"
                        />
                      )}
                      <motion.span
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.12 }}
                        className="relative z-10 flex items-center justify-center"
                      >
                        <Icon
                          className={`h-5 w-5 shrink-0 transition-transform duration-200 ease-out ${
                            isActive ? 'text-[#38BDF8] scale-105' : 'text-white/55'
                          }`}
                        />
                      </motion.span>
                    </div>

                    {/* Label */}
                    <span
                      className={`text-[10px] leading-tight text-center truncate max-w-full px-0.5 mt-0.5 transition-colors duration-200 ${
                        isActive ? 'text-[#38BDF8] font-bold' : 'text-white/55'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
