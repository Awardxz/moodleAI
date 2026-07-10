/**
 * moodleAI content script
 * Polls Moodle quiz pages, captures question context (text + image),
 * calls the configured AI provider, and shows a near-invisible answer.
 */

import { getSettings, onSettingsChanged } from '../shared/storage.js';
import { supportsVision } from '../shared/providers.js';
import { findQuestionElements, parseQuestion, buildUserPrompt } from './question.js';
import { captureQuestionImage } from './capture.js';
import { hasProcessedAnswer, clearAnswer, showAnswer, showStatus } from './display.js';

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

const POLL_MS = 3000;

let settings = null;
let lastQuestionText = '';
let inFlight = false;

async function init() {
  settings = await getSettings();
  console.log('[moodleAI] Loaded settings. Provider:', settings.provider, 'Enabled:', settings.enabled);

  onSettingsChanged((changes) => {
    const keys = Object.keys(changes);
    for (const key of keys) {
      if (changes[key].newValue !== undefined) {
        settings[key] = changes[key].newValue;
      }
    }
    console.log('[moodleAI] Settings updated');
  });

  setInterval(tick, POLL_MS);
}

async function tick() {
  if (!settings?.enabled) return;
  if (inFlight) return;

  const els = findQuestionElements();
  if (!els) return;
  if (hasProcessedAnswer()) return;

  const parsed = parseQuestion(els);
  if (!parsed.questionText) return;
  if (parsed.questionText === lastQuestionText) return;

  inFlight = true;
  lastQuestionText = parsed.questionText;

  clearAnswer();
  const target = els.ablock || els.qtext;

  try {
    if (!settings.apiKey) {
      showStatus('moodleAI: set your API key in the extension popup', target);
      return;
    }

    console.log('[moodleAI] Question detected:', parsed.questionText.slice(0, 120));

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

init();
