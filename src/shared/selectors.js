/**
 * Moodle DOM selector profiles.
 * Defaults match standard Moodle quiz markup (.qtext / .ablock / .que).
 * Users can pick a preset or enter custom CSS selectors for their university theme.
 */

/**
 * @typedef {object} SelectorConfig
 * @property {string} qtext   - Question text container (required)
 * @property {string} ablock  - Answer / options block
 * @property {string} root    - Question wrapper (closest ancestor of qtext)
 * @property {string} img     - Images inside the question
 * @property {string} select  - Dropdowns (fill-in / multi-blank)
 */

/** @type {SelectorConfig} */
export const DEFAULT_SELECTORS = {
  qtext: '.qtext',
  ablock: '.ablock',
  root: '.que',
  img: '.img-fluid, img[role="presentation"], img',
  select: 'select.select, select',
};

/**
 * Built-in theme / layout presets.
 * Selector lists are comma-separated alternatives (standard CSS).
 */
export const THEME_PRESETS = {
  standard: {
    id: 'standard',
    name: 'Standard Moodle (default)',
    description: 'Core Moodle quiz classes: .qtext + .ablock + .que',
    selectors: { ...DEFAULT_SELECTORS },
  },
  boost: {
    id: 'boost',
    name: 'Moodle Boost / Classic',
    description: 'Boost & Classic themes — same core classes with formulation fallbacks',
    selectors: {
      qtext: '.qtext, .formulation .qtext',
      ablock: '.ablock, .formulation .ablock',
      root: '.que',
      img: '.img-fluid, .qtext img, img[role="presentation"], img',
      select: 'select.select, .qtext select, select',
    },
  },
  answer: {
    id: 'answer',
    name: 'Options in .answer',
    description: 'When choices live in .answer instead of (or without) .ablock',
    selectors: {
      qtext: '.qtext',
      ablock: '.ablock, .answer, .ablock .answer',
      root: '.que',
      img: '.img-fluid, img[role="presentation"], img',
      select: 'select.select, select',
    },
  },
  questionId: {
    id: 'questionId',
    name: 'question-* wrappers',
    description: 'Roots like div[id^="question-"] used by some LMS skins',
    selectors: {
      qtext: '.qtext, .questiontext, .q-text',
      ablock: '.ablock, .answer, .answers, .q-answers',
      root: 'div[id^="question-"], .que, .question',
      img: '.img-fluid, img[role="presentation"], img',
      select: 'select.select, select',
    },
  },
  formulation: {
    id: 'formulation',
    name: 'Formulation block',
    description: 'Question body under .formulation (some custom themes)',
    selectors: {
      qtext: '.formulation .qtext, .formulation, .qtext',
      ablock: '.formulation .ablock, .formulation .answer, .ablock, .answer',
      root: '.que, .content',
      img: '.formulation img, .img-fluid, img',
      select: '.formulation select, select.select, select',
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom selectors…',
    description: 'Edit the fields below for your university Moodle theme',
    selectors: { ...DEFAULT_SELECTORS },
  },
};

export const THEME_PRESET_ORDER = [
  'standard',
  'boost',
  'answer',
  'questionId',
  'formulation',
  'custom',
];

/**
 * @param {string} [id]
 * @returns {typeof THEME_PRESETS[string]}
 */
export function getThemePreset(id) {
  return THEME_PRESETS[id] || THEME_PRESETS.standard;
}

/**
 * Merge partial config with defaults; drop empty strings.
 * @param {Partial<SelectorConfig>|null|undefined} value
 * @returns {SelectorConfig}
 */
export function normalizeSelectors(value) {
  const base = { ...DEFAULT_SELECTORS };
  if (!value || typeof value !== 'object') return base;

  for (const key of Object.keys(base)) {
    if (typeof value[key] === 'string' && value[key].trim()) {
      base[key] = value[key].trim();
    }
  }
  return base;
}

/**
 * Whether two selector configs match (for detecting custom edits).
 * @param {SelectorConfig} a
 * @param {SelectorConfig} b
 */
export function selectorsEqual(a, b) {
  const na = normalizeSelectors(a);
  const nb = normalizeSelectors(b);
  return (
    na.qtext === nb.qtext &&
    na.ablock === nb.ablock &&
    na.root === nb.root &&
    na.img === nb.img &&
    na.select === nb.select
  );
}

/**
 * Safely run querySelector; invalid CSS returns null.
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {Element|null}
 */
export function safeQuery(root, selector) {
  if (!root || !selector || !String(selector).trim()) return null;
  try {
    return root.querySelector(selector);
  } catch {
    console.warn('[moodleAI] Invalid selector:', selector);
    return null;
  }
}

/**
 * Safely run querySelectorAll.
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {Element[]}
 */
export function safeQueryAll(root, selector) {
  if (!root || !selector || !String(selector).trim()) return [];
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    console.warn('[moodleAI] Invalid selector:', selector);
    return [];
  }
}
