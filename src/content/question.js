/**
 * Moodle question DOM parsing helpers.
 * Uses configurable CSS selectors (theme profiles).
 */

import {
  DEFAULT_SELECTORS,
  normalizeSelectors,
  safeQuery,
  safeQueryAll,
} from '../shared/selectors.js';

/**
 * Find the active Moodle question root and answer block.
 * @param {import('../shared/selectors.js').SelectorConfig} [selectorConfig]
 * @returns {{ qtext: Element, ablock: Element|null, root: Element, selectors: object }|null}
 */
export function findQuestionElements(selectorConfig) {
  const s = normalizeSelectors(selectorConfig || DEFAULT_SELECTORS);

  const qtext = safeQuery(document, s.qtext);
  if (!qtext) return null;

  let root = qtext;
  if (s.root) {
    try {
      root = qtext.closest(s.root) || qtext.parentElement || qtext;
    } catch {
      root = qtext.parentElement || qtext;
    }
  } else {
    root = qtext.parentElement || qtext;
  }

  const ablock =
    safeQuery(root, s.ablock) ||
    safeQuery(document, s.ablock) ||
    null;

  return { qtext, ablock, root, selectors: s };
}

/**
 * Extract structured question payload for the AI.
 * @param {{ qtext: Element, ablock: Element|null, root: Element, selectors?: object }} els
 * @returns {{ questionText: string, optionsText: string, dropdownOptions: string, selectCount: number, img: HTMLImageElement|null }}
 */
export function parseQuestion(els) {
  const { qtext, ablock, root } = els;
  const s = normalizeSelectors(els.selectors || DEFAULT_SELECTORS);

  const questionText = (qtext.textContent || '').trim();
  const optionsText = ablock ? (ablock.textContent || '').trim() : '';

  // Prefer selects inside question text, then answer block, then root
  let selectElements = safeQueryAll(qtext, s.select);
  if (!selectElements.length && ablock) {
    selectElements = safeQueryAll(ablock, s.select);
  }
  if (!selectElements.length && root) {
    selectElements = safeQueryAll(root, s.select);
  }

  let dropdownOptions = '';
  let selectCount = 0;

  selectElements.forEach((select, index) => {
    const options = Array.from(select.querySelectorAll('option'))
      .filter((opt) => opt.value !== '')
      .map((opt) => `${opt.value}. ${opt.textContent.trim()}`)
      .join('\n');
    if (options) {
      selectCount += 1;
      dropdownOptions += `\n\nDropdown ${index + 1} Options:\n${options}`;
    }
  });

  const imgEl =
    safeQuery(root, s.img) ||
    safeQuery(qtext, s.img) ||
    null;

  return {
    questionText,
    optionsText,
    dropdownOptions,
    selectCount: selectCount || selectElements.length,
    img: imgEl instanceof HTMLImageElement ? imgEl : null,
  };
}

/**
 * Build the user message text for the model.
 * @param {{ questionText: string, optionsText: string, dropdownOptions: string, selectCount: number }} q
 * @returns {string}
 */
export function buildUserPrompt(q) {
  let text = `QUESTION:\n${q.questionText}`;

  if (q.dropdownOptions) {
    const multiNote =
      q.selectCount > 1
        ? `\n\nNote: This question has ${q.selectCount} dropdowns. Provide ONE answer per dropdown formatted exactly as: "Drop 1: [number], Drop 2: [number]".`
        : `\n\nNote: This is a fill-in-the-blank question with dropdown selections. Choose the correct option number.`;
    text += `\n\nDROPDOWN OPTIONS:${q.dropdownOptions}${multiNote}`;
  } else if (q.optionsText) {
    text += `\n\nANSWER OPTIONS:\n${q.optionsText}`;
  }

  return text;
}
