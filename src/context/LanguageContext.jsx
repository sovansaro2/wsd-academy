import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const translations = {
  km: {
    app: {
      title: 'WSD Academy',
      subtitle: 'ថ្នាលអប់រំឌីជីថល',
    },
    nav: {
      home: 'ទំព័រដើម',
      solver: 'ដោះស្រាយលំហាត់',
      resource: 'តែងសេចក្ដី',
      search: 'ស្វែងរក',
      library: 'បណ្ណាល័យ',
      more: 'ច្រើនទៀត',
      profile: 'គណនី',
      history: 'ប្រវត្តិដោះស្រាយ',
      admin: 'ផ្ទាំងគ្រប់គ្រង (Admin)',
    },
    user: {
      name: 'សុវណ្ណ សារ៉ូ',
      grade: 'ថ្នាក់ទី ១២',
    },
    profileTabs: {
      profile: 'ព័ត៌មានគណនី (Profile)',
      profileTitle: 'Profile',
      security: 'Password and Security',
      securityKh: 'ពាក្យសម្ងាត់ និងសុវត្ថិភាព',
      signInOptions: 'Sign In Options',
      signInOptionsKh: 'ជម្រើសចូលប្រើប្រាស់',
    },
    pages: {
      home: {
        title: 'ទំព័រដើម',
        subtitle: 'ដោះស្រាយលំហាត់ តែងសេចក្ដី និងអានសៀវភៅសិក្សាគោលថ្នាក់ទី ៤ ដល់ទី ១២។',
        placeholder: 'ជ្រើសរើសមុខងារសិក្សាខាងក្រោមដើម្បីចាប់ផ្ដើម។',
      },
      solver: {
        title: 'ដោះស្រាយលំហាត់',
        subtitle: 'គ្រោងឆ្អឹងផ្នែកដោះស្រាយលំហាត់។',
        placeholder: 'តំបន់ដោះស្រាយលំហាត់ (ត្រៀមសម្រាប់បង្កើតតាមដំណាក់កាល)',
      },
      resource: {
        title: 'តែងសេចក្ដី',
        subtitle: 'គ្រោងឆ្អឹងផ្នែកតែងសេចក្ដី។',
        placeholder: 'តំបន់តែងសេចក្ដី (ត្រៀមសម្រាប់បង្កើតតាមដំណាក់កាល)',
      },
      library: {
        title: 'បណ្ណាល័យសៀវភៅសិក្សា',
        subtitle: 'សៀវភៅសិក្សាគោលថ្នាក់ទី ៤ ដល់ទី ១២ សម្រាប់អាន និងរក្សាទុក Offline។',
        placeholder: 'មិនទាន់មានសៀវភៅនៅឡើយទេ',
      },
      history: {
        title: 'ប្រវត្តិដោះស្រាយ',
        subtitle: 'គ្រោងឆ្អឹងផ្នែកប្រវត្តិលំហាត់។',
        placeholder: 'តំបន់ប្រវត្តិ (ត្រៀមសម្រាប់បង្កើតតាមដំណាក់កាល)',
      },
      profile: {
        title: 'គណនី',
        subtitle: 'គ្រោងឆ្អឹងផ្នែកគណនី និងការកំណត់។',
        placeholder: 'តំបន់គណនី (ត្រៀមសម្រាប់បង្កើតតាមដំណាក់កាល)',
      },
      admin: {
        title: 'ផ្ទាំងគ្រប់គ្រង (Admin Panel)',
        subtitle: 'គ្រោងឆ្អឹងផ្ទាំងគ្រប់គ្រងសម្រាប់តែអ្នកគ្រប់គ្រង (Admin) ប៉ុណ្ណោះ។ ត្រៀមសម្រាប់ដាក់មុខងារគ្រប់គ្រងលម្អិត។',
        placeholder: 'តំបន់គ្រប់គ្រងទិន្នន័យ ប្រព័ន្ធ និងអ្នកប្រើប្រាស់ (ត្រៀមសម្រាប់បង្កើតតាមដំណាក់កាល)',
      },
    },
    common: {
      close: 'បិទ',
      save: 'រក្សាទុក',
      cancel: 'បោះបង់',
      confirm: 'បញ្ជាក់',
      search: 'ស្វែងរក',
      loading: 'កំពុងដំណើរការ...',
      switchLang: 'ប្ដូរភាសា',
    },
  },
  en: {
    app: {
      title: 'WSD Academy',
      subtitle: 'Digital Learning Platform',
    },
    nav: {
      home: 'Home',
      solver: 'Solver',
      resource: 'Essay Writing',
      search: 'Search',
      library: 'Library',
      more: 'More',
      profile: 'Account',
      history: 'History',
      admin: 'Admin Panel',
    },
    user: {
      name: 'Sovan Saro',
      grade: 'Grade 12',
    },
    profileTabs: {
      profile: 'Profile',
      profileTitle: 'Profile',
      security: 'Password and Security',
      securityKh: 'Password and Security',
      signInOptions: 'Sign In Options',
      signInOptionsKh: 'Sign In Options',
    },
    pages: {
      home: {
        title: 'Home',
        subtitle: 'Solve exercises, write Khmer essays, and read Grades 4–12 textbooks offline.',
        placeholder: 'Choose a study tool below to get started.',
      },
      solver: {
        title: 'Problem Solver',
        subtitle: 'Problem solver skeleton section.',
        placeholder: 'Problem solver area (ready for step-by-step development)',
      },
      resource: {
        title: 'Essay Writing',
        subtitle: 'Essay writing section skeleton.',
        placeholder: 'Essay writing area (ready for step-by-step development)',
      },
      library: {
        title: 'Digital Library',
        subtitle: 'Textbooks for Grades 4 to 12 with offline reading support.',
        placeholder: 'No books available yet',
      },
      history: {
        title: 'Solution History',
        subtitle: 'Solution history skeleton section.',
        placeholder: 'History area (ready for step-by-step development)',
      },
      profile: {
        title: 'Account',
        subtitle: 'Personal account and settings skeleton.',
        placeholder: 'Account area (ready for step-by-step development)',
      },
      admin: {
        title: 'Admin Panel',
        subtitle: 'Administrative dashboard for Admins only. Ready for comprehensive management features.',
        placeholder: 'System management, users, and content area (ready for step-by-step development)',
      },
    },
    common: {
      close: 'Close',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      search: 'Search',
      loading: 'Loading...',
      switchLang: 'Switch Language',
    },
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem('wsd_app_lang');
      return saved === 'en' ? 'en' : 'km';
    } catch {
      return 'km';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wsd_app_lang', language);
    } catch {
      // Ignore storage write errors
    }
    // Update HTML lang attribute
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'km' ? 'en' : 'km'));
  };

  const t = (path) => {
    const keys = path.split('.');
    let current = translations[language] || translations.km;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return path;
      }
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
