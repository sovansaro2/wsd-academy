import React from 'react';
import Card from '../components/common/Card';
import AuthRequiredBanner from '../components/auth/AuthRequiredBanner';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function HistoryPage() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();

  return (
    <div id="history-page" className="space-y-6 font-kh-body">
      {/* Page Header */}
      <Card
        title={t('pages.history.title')}
        subtitle={t('pages.history.subtitle')}
      />

      {/* Auth Protection */}
      {!isAuthenticated ? (
        <AuthRequiredBanner
          featureName={language === 'km' ? 'ប្រវត្តិដោះស្រាយ' : 'Solving History'}
        />
      ) : (
        /* Content Placeholder when authenticated */
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-12 text-center text-white/75">
          <p className="text-sm">{t('pages.history.placeholder')}</p>
        </div>
      )}
    </div>
  );
}
