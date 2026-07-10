/**
 * Moodle question DOM parsing helpers.
 */

/**
 * Find the active Moodle question root and answer block.
 * @returns {{ qtext: Element, ablock: Element|null, root: Element }|null}
 */
export function findQuestionElements() {
  const qtext = document.querySelector('.qtext');
  if (!qtext) return null;

  const root = qtext.closest('.que') || qtext.parentElement || qtext;
  const ablock =
    root.querySelector?.('.ablock') ||
    document.querySelector('.ablock') ||
    null;

  return { qtext, ablock, root };
}

/**
 * Extract structured question payload for the AI.
 * @param {{ qtext: Element, ablock: Element|null }} els
 * @returns {{ questionText: string, optionsText: string, dropdownOptions: string, selectCount: number, img: HTMLImageElement|null }}
 */
export function parseQuestion(els) {
  const { qtext, ablock, root } = els;

  const questionText = (qtext.textContent || '').trim();
  const optionsText = ablock ? (ablock.textContent || '').trim() : '';

  const selectElements = qtext.querySelectorAll('select.select, select');
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

  const img =
    root?.querySelector?.('.img-fluid') ||
    qtext.querySelector('img') ||
    root?.querySelector?.('img[role="presentation"]') ||
    root?.querySelector?.('img') ||
    null;

  return {
    questionText,
    optionsText,
    dropdownOptions,
    selectCount: selectCount || selectElements.length,
    img: img instanceof HTMLImageElement ? img : null,
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
