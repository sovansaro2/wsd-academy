import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import logoNameImg from '../../assets/logoname.png';
import SupportModal from '../common/SupportModal';
import RecommendBookModal from '../common/RecommendBookModal';

export default function DesktopFooter() {
  const { language, t } = useLanguage();
  const { isAdmin } = useAuth();
  const isKm = language === 'km';
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);

  const studyLinks = [
    { to: '/library', label: isKm ? 'បណ្ណាល័យ' : 'Library' },
    { to: '/solver', label: isKm ? 'ដោះស្រាយលំហាត់' : 'Problem Solver' },
    { to: '/resource', label: isKm ? 'តែងសេចក្ដី' : 'Essay Writing' },
    { to: '/graph', label: isKm ? 'គូសសង់ក្រាហ្វ' : 'Graphing Lab' },
  ];

  const resourceLinks = [
    { to: '/search', label: isKm ? 'ស្វែងរក' : 'Search' },
    { to: '/downloads', label: isKm ? 'សៀវភៅបានទាញយក' : 'Downloaded Books' },
    { to: '/history', label: isKm ? 'ប្រវត្តិសិក្សា' : 'Study History' },
    { to: '/profile', label: isKm ? 'គណនី' : 'Account' },
  ];

  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer
        id="desktop-footer"
        className="hidden md:block w-full bg-[#153944]/85 border-t border-white/10 font-kh-body mt-auto"
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-12 gap-8">
            {/* Brand & Description */}
            <div className="col-span-5 space-y-3 pr-4">
              <Link to="/" className="inline-flex items-center transition-opacity hover:opacity-90">
                <img
                  src={logoNameImg}
                  alt={t('app.title')}
                  className="h-10 w-auto object-contain select-none"
                />
              </Link>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-sm">
                {isKm
                  ? 'កម្មវិធីសិក្សាឌីជីថល សម្រាប់សិស្សានុសិស្សទាំង ៣ កម្រិត បឋមសិក្សា អនុវិទ្យាល័យ និងវិទ្យាល័យ។'
                  : 'Digital learning platform for Primary, Lower Secondary, and Upper Secondary students.'}
              </p>
            </div>

            {/* Study Tools Column */}
            <div className="col-span-3 space-y-3">
              <h3 className="text-xs font-semibold tracking-wide text-white/90 uppercase">
                {isKm ? 'ផ្នែកសិក្សា' : 'Study Tools'}
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-white/65">
                {studyLinks.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="hover:text-white transition-colors inline-block"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources & Account Column */}
            <div className="col-span-2 space-y-3">
              <h3 className="text-xs font-semibold tracking-wide text-white/90 uppercase">
                {isKm ? 'ធនធានសិក្សា' : 'Resources'}
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-white/65">
                {resourceLinks.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="hover:text-white transition-colors inline-block"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* General & Contact Column */}
            <div className="col-span-2 space-y-3">
              <h3 className="text-xs font-semibold tracking-wide text-white/90 uppercase">
                {isKm ? 'ផ្សេងៗ' : 'General'}
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-white/65">
                <li>
                  <Link to="/more" className="hover:text-white transition-colors inline-block">
                    {isKm ? 'ច្រើនទៀត' : 'More'}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsRecommendOpen(true)}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    {isKm ? 'ណែនាំសៀវភៅ' : 'Recommend Book'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsSupportOpen(true)}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    {isKm ? 'ឧបត្ថម្ភ' : 'Support'}
                  </button>
                </li>
                <li>
                  <a
                    href="https://t.me/sovansaro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <span>Telegram</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </li>
                {isAdmin && (
                  <li>
                    <Link to="/admin" className="hover:text-white transition-colors inline-block">
                      {isKm ? 'ផ្ទាំងគ្រប់គ្រង' : 'Admin Panel'}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Row */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/55">
            <span>
              © {currentYear} WSD Academy ·{' '}
              {isKm ? 'រក្សាសិទ្ធិគ្រប់យ៉ាង' : 'All rights reserved'}
            </span>
            <span>
              {isKm
                ? 'សៀវភៅសិក្សា និងឧបករណ៍សិក្សាសម្រាប់ថ្នាក់ទី ៤ ដល់ទី ១២'
                : 'Textbooks & study tools for Grades 4 to 12'}
            </span>
          </div>
        </div>
      </footer>

      <RecommendBookModal
        isOpen={isRecommendOpen}
        onClose={() => setIsRecommendOpen(false)}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
    </>
  );
}
