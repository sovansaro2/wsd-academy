export const LIBRARY_LEVELS = [
  { id: 'all', labelKm: 'គ្រប់កម្រិត', labelEn: 'All Levels' },
  { id: 'primary', labelKm: 'បឋម (៤–៦)', labelEn: 'Primary (4–6)' },
  { id: 'lower_secondary', labelKm: 'អនុវិទ្យាល័យ (៧–៩)', labelEn: 'Lower Sec (7–9)' },
  { id: 'upper_secondary', labelKm: 'វិទ្យាល័យ (១០–១២)', labelEn: 'Upper Sec (10–12)' },
  { id: 'general_knowledge', labelKm: 'ចំណេះដឹងទូទៅ', labelEn: 'General Knowledge' },
];

export const LIBRARY_GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

export const SUBJECT_COVER_THEMES = {
  math: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'គណិតវិទ្យា', labelEn: 'Mathematics' },
  khmer: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'ភាសាខ្មែរ', labelEn: 'Khmer Literature' },
  english: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'ភាសាអង់គ្លេស', labelEn: 'English' },
  french: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'ភាសាបារាំង', labelEn: 'French' },
  physics: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'រូបវិទ្យា', labelEn: 'Physics' },
  chemistry: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'គីមីវិទ្យា', labelEn: 'Chemistry' },
  biology: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'ជីវវិទ្យា', labelEn: 'Biology' },
  earth: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'ផែនដីវិទ្យា', labelEn: 'Earth Science' },
  science: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'វិទ្យាសាស្ត្រ', labelEn: 'Science' },
  history: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'ប្រវត្តិវិទ្យា', labelEn: 'History' },
  geography: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'ភូមិវិទ្យា', labelEn: 'Geography' },
  civics: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'សីលធម៌-ពលរដ្ឋ', labelEn: 'Civics' },
  social: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'សិក្សាសង្គម', labelEn: 'Social Studies' },
  economics: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'សេដ្ឋកិច្ច', labelEn: 'Economics' },
  ict: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'ព័ត៌មានវិទ្យា', labelEn: 'ICT' },
  home_economics: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'គេហវិទ្យា', labelEn: 'Home Economics' },
  general: { accent: '#FFFFFF', tint: 'transparent', labelKm: 'សៀវភៅសិក្សា', labelEn: 'Textbook' },
  general_knowledge: { accent: '#38BDF8', tint: 'transparent', labelKm: 'ចំណេះដឹងទូទៅ', labelEn: 'General Knowledge' },
};

const KHMER_NUMERALS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

export function toKhmerNumber(num) {
  return String(num)
    .split('')
    .map((ch) => (ch >= '0' && ch <= '9' ? KHMER_NUMERALS[Number(ch)] : ch))
    .join('');
}

export function formatGradeLabel(grade, isKm = true) {
  if (Number(grade) === 0 || grade === 'general_knowledge') {
    return isKm ? 'ចំណេះដឹងទូទៅ' : 'General Knowledge';
  }
  return isKm ? `ថ្នាក់ទី ${toKhmerNumber(grade)}` : `Grade ${grade}`;
}

export function formatGradeBadgeNumber(grade, isKm = true) {
  if (Number(grade) === 0 || grade === 'general_knowledge') {
    return isKm ? 'ទូទៅ' : 'GK';
  }
  return toKhmerNumber(grade);
}

export function formatFileSize(bytes) {
  const num = Number(bytes || 0);
  if (num <= 0) return '—';
  const mb = num / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(num / 1024))} KB`;
}

export function getSubjectTheme(subject) {
  return SUBJECT_COVER_THEMES[subject] || SUBJECT_COVER_THEMES.general;
}
