/**
 * moodleAI content script
 * Detects Moodle questions and solves via AI either:
 *  - auto mode (default): poll for new questions
 *  - manual mode: only when the configured solve hotkey is pressed
 */

import { getSettings, onSettingsChanged } from '../shared/storage.js';
import { supportsVision } from '../shared/providers.js';
import {
  DEFAULT_SOLVE_HOTKEY,
  eventMatchesHotkey,
  formatHotkey,
  normalizeHotkey,
} from '../shared/hotkeys.js';
import { findQuestionElements, parseQuestion, buildUserPrompt } from './question.js';
import { captureQuestionImage } from './capture.js';
import { hasProcessedAnswer, clearAnswer, showAnswer, showStatus } from './display.js';

const POLL_MS = 3000;

let settings = null;
let lastQuestionText = '';
let inFlight = false;
let pollTimer = null;

/**
 * Run chat completion in the background page (host permissions, no page CORS).
 * @param {object} payload
 * @returns {Promise<string>}
 */
function requestChatCompletion(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'chatCompletion', payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      if (!response?.answer) {
        reject(new Error('Empty answer from background'));
        return;
      }
      resolve(response.answer);
    });
  });
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    solve({ force: false });
  }, POLL_MS);
}

function stopPolling() {
  if (pollTimer != null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Apply auto vs manual mode from current settings. */
function applySolveMode() {
  if (!settings?.enabled) {
    stopPolling();
    return;
  }

  if (settings.solveMode === 'manual') {
    stopPolling();
    console.log(
      '[moodleAI] Manual mode — press',
      formatHotkey(settings.solveHotkey),
      'to solve'
    );
  } else {
    startPolling();
    console.log('[moodleAI] Auto mode — polling for questions');
  }
}

/**
 * @param {{ force?: boolean }} opts
 * force=true: hotkey / re-solve (ignore prior answer for this question)
 */
async function solve({ force = false } = {}) {
  if (!settings?.enabled) return;
  if (inFlight) return;

  const els = findQuestionElements();
  if (!els) {
    if (force) {
      console.log('[moodleAI] Solve hotkey pressed but no Moodle question found');
    }
    return;
  }

  const parsed = parseQuestion(els);
  if (!parsed.questionText) return;

  if (!force) {
    if (hasProcessedAnswer()) return;
    if (parsed.questionText === lastQuestionText) return;
  }

  inFlight = true;
  lastQuestionText = parsed.questionText;

  clearAnswer();
  const target = els.ablock || els.qtext;

  try {
    if (!settings.apiKey) {
      showStatus('moodleAI: set your API key in the extension popup', target);
      return;
    }

    console.log(
      '[moodleAI] Solving',
      force ? '(manual/hotkey)' : '(auto)',
      ':',
      parsed.questionText.slice(0, 120)
    );

    let imageDataUrl = null;
    const needsImage = Boolean(parsed.img);

    if (needsImage) {
      if (supportsVision(settings.provider)) {
        console.log('[moodleAI] Image detected — capturing for vision model');
        imageDataUrl = await captureQuestionImage(els.root || els.qtext, parsed.img);
      } else {
        console.log('[moodleAI] Image present but provider has no vision support; text only');
      }
    } else {
      console.log('[moodleAI] No image — text-only request');
    }

    const userText = buildUserPrompt(parsed);
    const model = imageDataUrl
      ? settings.visionModel || settings.textModel
      : settings.textModel;

    const answer = await requestChatCompletion({
      providerId: settings.provider,
      apiKey: settings.apiKey,
      model,
      systemPrompt: settings.customPrompt,
      userText,
      imageDataUrl,
    });

    showAnswer(answer, target);
  } catch (err) {
    console.error('[moodleAI] Error:', err);
    showStatus(`Error: ${err.message || 'failed to get answer'}`, target);
  } finally {
    inFlight = false;
  }
}

function onKeyDown(e) {
  if (!settings?.enabled) return;

  // Answer visibility toggle stays on " (handled in display.js)
  if (eventMatchesHotkey(e, settings.solveHotkey || DEFAULT_SOLVE_HOTKEY)) {
    e.preventDefault();
    e.stopPropagation();
    solve({ force: true });
  }
}

async function init() {
  settings = await getSettings();
  console.log(
    '[moodleAI] Loaded. Provider:',
    settings.provider,
    'Mode:',
    settings.solveMode,
    'Hotkey:',
    formatHotkey(settings.solveHotkey),
    'Enabled:',
    settings.enabled
  );

  onSettingsChanged((changes) => {
    const keys = Object.keys(changes);
    for (const key of keys) {
      if (changes[key].newValue !== undefined) {
        if (key === 'solveHotkey') {
          settings.solveHotkey = normalizeHotkey(changes[key].newValue);
        } else {
          settings[key] = changes[key].newValue;
        }
      }
    }

    if (keys.includes('solveMode') || keys.includes('enabled')) {
      applySolveMode();
    }
    console.log('[moodleAI] Settings updated');
  });

  window.addEventListener('keydown', onKeyDown, true);
  applySolveMode();
}

init();
