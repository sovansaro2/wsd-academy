import React from 'react';
import { MotionConfig } from 'motion/react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import AppStartupLoader from './components/common/AppStartupLoader';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <AuthProvider>
          <AppStartupLoader />
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </MotionConfig>
  );
}
