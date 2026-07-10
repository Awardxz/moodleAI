/**
 * Answer display — preserves original UX:
 * - Gray / near-invisible text (opacity 0.1)
 * - Toggle visibility with the " key
 */

const ANSWER_CLASS = 'ai-answer-processed';
const ANSWER_OPACITY = '0.1';

let answerElement = null;
let keyListenerBound = false;

/**
 * Whether an answer has already been injected for the current question.
 * @returns {boolean}
 */
export function hasProcessedAnswer() {
  return Boolean(document.querySelector(`.${ANSWER_CLASS}`));
}

/**
 * Remove the current answer element if present.
 */
export function clearAnswer() {
  if (answerElement) {
    answerElement.remove();
    answerElement = null;
  }
  const existing = document.querySelector(`.${ANSWER_CLASS}`);
  if (existing) existing.remove();
}

/**
 * Inject the AI answer under the options/question block.
 * Display style is intentionally unchanged from the original extension.
 *
 * @param {string} answerHtml
 * @param {Element} targetElement - .ablock or .qtext
 */
export function showAnswer(answerHtml, targetElement) {
  clearAnswer();

  answerElement = document.createElement('p');
  answerElement.innerHTML = answerHtml;
  answerElement.style.opacity = ANSWER_OPACITY;
  answerElement.classList.add(ANSWER_CLASS);
  targetElement.appendChild(answerElement);

  ensureToggleListener();
}

/**
 * Show a temporary status/error with the same gray style.
 * @param {string} message
 * @param {Element} targetElement
 */
export function showStatus(message, targetElement) {
  showAnswer(message, targetElement);
}

function ensureToggleListener() {
  if (keyListenerBound) return;
  keyListenerBound = true;

  window.addEventListener('keydown', (e) => {
    if (e.key === '"') {
      if (answerElement) {
        answerElement.style.opacity =
          answerElement.style.opacity === ANSWER_OPACITY ? '0' : ANSWER_OPACITY;
      }
    }
  });
}
