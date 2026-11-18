export const ESSAY_PRESETS = [
  {
    id: 'bacii-discussion-knowledge',
    grade: '12',
    type: 'discussion',
    typeLabelKm: 'ពិភាក្សា',
    typeLabelEn: 'Discussion',
    topic: 'មតិមួយលើកឡើងថា៖ «មានតែវិជ្ជាជីវៈផ្នែកវិទ្យាសាស្ត្រទេ ទើបអាចជួយអភិវឌ្ឍប្រទេសជាតិឱ្យរីកចម្រើនបាន»។ តើមតិខាងលើនេះត្រឹមត្រូវទាំងស្រុងដែរឬទេ? ចូរពិភាក្សាដោយលើកឧទាហរណ៍ក្នុងអក្សរសិល្ប៍ និងសង្គមមកបញ្ជាក់។',
  },
  {
    id: 'bacii-explanatory-kolab',
    grade: '12',
    type: 'explanatory',
    typeLabelKm: 'ពន្យល់',
    typeLabelEn: 'Explanatory',
    topic: 'ពំនោលមួយពោលថា៖ «ខ្លួនទីពឹងខ្លួន ទើបជាមូលដ្ឋានគ្រឹះនៃភាពជោគជ័យក្នុងជីវិត»។ ចូរពន្យល់ពំនោលខាងលើនេះ ដោយលើកយកឧទាហរណ៍ក្នុងរឿង «កុលាបប៉ៃលិន» និងសង្គមជាក់ស្ដែងមកបញ្ជាក់។',
  },
  {
    id: 'bacii-literary-phka-srabon',
    grade: '12',
    type: 'literary',
    typeLabelKm: 'វិភាគអក្សរសិល្ប៍',
    typeLabelEn: 'Literary Analysis',
    topic: 'តាមរយៈរឿង «ផ្កាស្រពោន» របស់លោក នូ ហាច តើអ្នកនិពន្ធចង់ឆ្លុះបញ្ចាំងពីទស្សនៈសង្គម និងផ្ដល់តម្លៃអប់រំអ្វីខ្លះដល់យុវជនជំនាន់ក្រោយ? ចូរវិភាគ។',
  },
  {
    id: 'g11-discussion-tum-teav',
    grade: '11',
    type: 'discussion',
    typeLabelKm: 'ពិភាក្សា',
    typeLabelEn: 'Discussion',
    topic: 'ទស្សនៈបុរាណមួយលើកឡើងថា៖ «នំមិនធំជាងនាឡិ»។ ចូរពិភាក្សាទស្សនៈនេះដោយប្រៀបធៀបទៅនឹងជីវិតស្នេហាក្នុងរឿង «ទុំទាវ» និងសង្គមបច្ចុប្បន្ន។',
  },
  {
    id: 'g11-comparative-characters',
    grade: '11',
    type: 'comparative',
    typeLabelKm: 'ប្រៀបធៀប',
    typeLabelEn: 'Comparative',
    topic: 'ចូរប្រៀបធៀបលក្ខណៈសម្បត្តិ និងជីវិតតស៊ូរបស់តួអង្គ «ចៅចិត្រ» ក្នុងរឿងកុលាបប៉ៃលិន និងតួអង្គ «ប៊ុនធឿន» ក្នុងរឿងផ្កាស្រពោន។',
  },
  {
    id: 'g10-explanatory-morality',
    grade: '10',
    type: 'explanatory',
    typeLabelKm: 'ពន្យល់',
    typeLabelEn: 'Explanatory',
    topic: 'ក្នុងច្បាប់ក្រមង៉ុយ ភិរម្យភាសាអ៊ូ បានទូន្មានថា៖ «កុំខ្ជិលកុំដេក យកចំណេះដាក់ខ្លួន»។ ចូរពន្យល់ខ្លឹមសារអប់រំនៃដំបូន្មាននេះ ដោយផ្សារភ្ជាប់នឹងការសិក្សារបស់សិស្ស។',
  },
];

export const ESSAY_TYPE_OPTIONS = [
  { value: 'auto', labelKm: 'ស្វ័យប្រវត្តិ', labelEn: 'Auto Detect' },
  { value: 'descriptive', labelKm: 'បែបពណ៌នា', labelEn: 'Descriptive' },
  { value: 'narrative', labelKm: 'បែបនិទានរឿង', labelEn: 'Narrative' },
  { value: 'explanatory', labelKm: 'បែបពន្យល់', labelEn: 'Explanatory' },
  { value: 'discussion', labelKm: 'បែបពិភាក្សា', labelEn: 'Discussion' },
  { value: 'comparative', labelKm: 'បែបប្រៀបធៀប', labelEn: 'Comparative' },
  { value: 'literary', labelKm: 'វិភាគអក្សរសិល្ប៍', labelEn: 'Literary' },
];

export const GRADE_LEVEL_GROUPS = [
  {
    band: 'upper_secondary',
    labelKm: 'វិទ្យាល័យ (ថ្នាក់ទី ១០ – ១២)',
    labelEn: 'Upper Secondary (Grades 10–12)',
    grades: [
      { value: '12', labelKm: 'ថ្នាក់ទី ១២ (បាក់ឌុប)', labelEn: 'Grade 12 (BacII)' },
      { value: '11', labelKm: 'ថ្នាក់ទី ១១', labelEn: 'Grade 11' },
      { value: '10', labelKm: 'ថ្នាក់ទី ១០', labelEn: 'Grade 10' },
    ],
  },
  {
    band: 'lower_secondary',
    labelKm: 'អនុវិទ្យាល័យ (ថ្នាក់ទី ៧ – ៩)',
    labelEn: 'Lower Secondary (Grades 7–9)',
    grades: [
      { value: '9', labelKm: 'ថ្នាក់ទី ៩ (ឌីប្លូម)', labelEn: 'Grade 9 (Diploma)' },
      { value: '8', labelKm: 'ថ្នាក់ទី ៨', labelEn: 'Grade 8' },
      { value: '7', labelKm: 'ថ្នាក់ទី ៧', labelEn: 'Grade 7' },
    ],
  },
  {
    band: 'primary',
    labelKm: 'បឋមសិក្សា (ថ្នាក់ទី ៤ – ៦)',
    labelEn: 'Primary (Grades 4–6)',
    grades: [
      { value: '6', labelKm: 'ថ្នាក់ទី ៦', labelEn: 'Grade 6' },
      { value: '5', labelKm: 'ថ្នាក់ទី ៥', labelEn: 'Grade 5' },
      { value: '4', labelKm: 'ថ្នាក់ទី ៤', labelEn: 'Grade 4' },
    ],
  },
];

export function getGradeBand(grade) {
  const num = Number(grade);
  if (num >= 4 && num <= 6) return 'primary';
  if (num >= 7 && num <= 9) return 'lower_secondary';
  return 'upper_secondary';
}

export function getGradeLabel(grade, isKm) {
  for (const group of GRADE_LEVEL_GROUPS) {
    const found = group.grades.find((g) => g.value === String(grade));
    if (found) {
      const levelShort =
        group.band === 'primary'
          ? isKm
            ? 'បឋមសិក្សា'
            : 'Primary'
          : group.band === 'lower_secondary'
          ? isKm
            ? 'អនុវិទ្យាល័យ'
            : 'Lower Secondary'
          : isKm
          ? 'វិទ្យាល័យ'
          : 'Upper Secondary';
      return `${levelShort} · ${isKm ? found.labelKm : found.labelEn}`;
    }
  }
  return isKm ? `ថ្នាក់ទី ${grade}` : `Grade ${grade}`;
}

export function getEssayTypeOptionsForGrade(grade) {
  const band = getGradeBand(grade);
  if (band === 'primary') {
    return ESSAY_TYPE_OPTIONS.filter((opt) =>
      ['auto', 'descriptive', 'narrative', 'explanatory'].includes(opt.value)
    );
  }
  if (band === 'lower_secondary') {
    return ESSAY_TYPE_OPTIONS.filter((opt) =>
      ['auto', 'explanatory', 'discussion', 'descriptive', 'narrative', 'literary'].includes(opt.value)
    );
  }
  return ESSAY_TYPE_OPTIONS.filter((opt) =>
    ['auto', 'explanatory', 'discussion', 'comparative', 'literary'].includes(opt.value)
  );
}

export function getDefaultLengthForGrade(grade) {
  const band = getGradeBand(grade);
  if (band === 'primary') return 'short';
  if (band === 'lower_secondary') return 'medium';
  return 'bacii_standard';
}

export const ESSAY_LENGTH_OPTIONS = [
  {
    value: 'short',
    labelKm: 'ខ្លី · ១–២ ទំព័រ',
    labelEn: 'Short · 1–2 pages',
    hintKm: '~៤០០–៥៥០ ពាក្យ',
    hintEn: '~400–550 words',
  },
  {
    value: 'medium',
    labelKm: 'មធ្យម · ២–៣ ទំព័រ',
    labelEn: 'Medium · 2–3 pages',
    hintKm: '~៧០០–៩០០ ពាក្យ',
    hintEn: '~700–900 words',
  },
  {
    value: 'bacii_standard',
    labelKm: 'បាក់ឌុប · ៣–៤ ទំព័រ A4',
    labelEn: 'BacII · 3–4 A4 pages',
    hintKm: '~១,០០០–១,៣០០ ពាក្យ',
    hintEn: '~1,000–1,300 words',
  },
  {
    value: 'bacii_extended',
    labelKm: 'វែងពិសេស · ៤–៥ ទំព័រ A4',
    labelEn: 'Extended · 4–5 A4 pages',
    hintKm: '~១,៤០០–១,៨៥០ ពាក្យ',
    hintEn: '~1,400–1,850 words',
  },
  {
    value: 'custom',
    labelKm: 'កំណត់ខ្លួនឯង',
    labelEn: 'Custom',
    hintKm: 'ជ្រើសរើសទំព័រ ឬពាក្យ',
    hintEn: 'Custom pages or words',
  },
];

export function getEssayLengthMetrics(data) {
  const plainText = formatEssayToPlainText(data);
  if (!plainText) {
    return { wordCount: 0, charCount: 0, estimatedPages: 0 };
  }

  let wordCount = 0;
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('km', { granularity: 'word' });
    for (const seg of segmenter.segment(plainText)) {
      if (seg.isWordLike) wordCount += 1;
    }
  } else {
    wordCount = plainText.split(/\s+/).filter(Boolean).length;
  }

  const charCount = plainText.replace(/\s+/g, '').length;
  // Standard Cambodian handwritten A4 / exam paper holds ~300 Khmer words per page
  const estimatedPages = Math.max(0.5, Number((wordCount / 300).toFixed(1)));

  return { wordCount, charCount, estimatedPages };
}

export function formatOutlineToPlainText(data) {
  if (!data || !data.outline) return '';
  const { detected_topic, essay_type_label, keywords, topic_meaning, outline } = data;
  const lines = [];

  lines.push(`ប្រធាន៖ ${detected_topic || ''}`);
  lines.push(`ប្រភេទប្រធាន៖ ${essay_type_label || ''}`);
  lines.push('');

  lines.push('១. សេចក្ដីផ្ដើម');
  lines.push(`- លំនាំបញ្ហា៖ ${outline.introduction?.lead_in || ''}`);
  lines.push(`- ចំណូលបញ្ហា៖ ${outline.introduction?.topic_introduction || ''}`);
  lines.push('- ចំណោទបញ្ហា៖');
  (outline.introduction?.problem_questions || []).forEach((q) => {
    lines.push(`  • ${q}`);
  });
  lines.push('');

  lines.push('២. តួសេចក្ដី');
  lines.push(`- ឃ្លាភ្ជាប់សេចក្ដី៖ ${outline.body?.transition_phrase || ''}`);
  if (keywords && keywords.length > 0) {
    lines.push('- ពន្យល់ពាក្យគន្លឹះ៖');
    keywords.forEach((kw) => {
      lines.push(`  • ${kw.word}៖ ${kw.explanation}`);
    });
  }
  if (topic_meaning) {
    lines.push(`- ន័យប្រធាន៖ ${topic_meaning}`);
  }
  lines.push(`- បំណកស្រាយ / មតិស្រប៖ ${outline.body?.thesis_explanation || ''}`);
  if (outline.body?.counter_argument) {
    lines.push(`- មតិផ្ទុយ / ចំណុចខុសគ្នា៖ ${outline.body.counter_argument}`);
  }
  if (outline.body?.synthesis) {
    lines.push(`- មតិសំយោគ៖ ${outline.body.synthesis}`);
  }
  if (outline.body?.literary_examples?.length > 0) {
    lines.push('- ឧទាហរណ៍អក្សរសិល្ប៍៖');
    outline.body.literary_examples.forEach((ex) => {
      lines.push(`  • ${ex.work_title} (${ex.author}) - ${ex.character_or_event}៖ ${ex.connection}`);
    });
  }
  if (outline.body?.social_examples?.length > 0) {
    lines.push('- ឧទាហរណ៍សង្គម៖');
    outline.body.social_examples.forEach((ex) => {
      lines.push(`  • ${ex}`);
    });
  }
  lines.push(`- សន្និដ្ឋានរួមតាមតួសេចក្ដី៖ ${outline.body?.body_conclusion || ''}`);
  lines.push('');

  lines.push('៣. សេចក្ដីបញ្ចប់');
  lines.push(`- វាយតម្លៃប្រធាន៖ ${outline.conclusion?.evaluation || ''}`);
  lines.push(`- ទស្សនៈផ្ទាល់ខ្លួន និងដំណោះស្រាយ៖ ${outline.conclusion?.personal_view || ''}`);

  return lines.join('\n');
}

export function formatEssayToPlainText(data) {
  if (!data || !Array.isArray(data.annotated_essay)) return '';
  return data.annotated_essay
    .map((segment) => (segment.content || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

