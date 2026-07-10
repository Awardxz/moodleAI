/**
 * Chrome storage helpers for extension settings.
 */

import { DEFAULT_PROMPTS } from './prompts.js';
import { getProvider } from './providers.js';

export const STORAGE_KEYS = {
  provider: 'provider',
  apiKey: 'apiKey',
  textModel: 'textModel',
  visionModel: 'visionModel',
  subject: 'subject',
  customPrompt: 'customPrompt',
  enabled: 'enabled',
};

const DEFAULTS = {
  provider: 'groq',
  apiKey: '',
  textModel: '',
  visionModel: '',
  subject: 'Unified',
  customPrompt: DEFAULT_PROMPTS.Unified,
  enabled: true,
};

/**
 * @returns {Promise<object>}
 */
export function getSettings() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve({ ...DEFAULTS });
      return;
    }

    chrome.storage.local.get(Object.values(STORAGE_KEYS), (result) => {
      const providerId = result.provider || DEFAULTS.provider;
      const provider = getProvider(providerId);

      resolve({
        provider: providerId,
        apiKey: result.apiKey || '',
        textModel: result.textModel || provider.defaults.text,
        visionModel: result.visionModel || provider.defaults.vision || provider.defaults.text,
        subject: result.subject || DEFAULTS.subject,
        customPrompt:
          result.customPrompt !== undefined && result.customPrompt !== null
            ? result.customPrompt
            : DEFAULT_PROMPTS[result.subject || DEFAULTS.subject] || DEFAULTS.customPrompt,
        enabled: result.enabled !== false,
      });
    });
  });
}

/**
 * @param {object} settings
 * @returns {Promise<void>}
 */
export function saveSettings(settings) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      reject(new Error('chrome.storage unavailable'));
      return;
    }
    chrome.storage.local.set(settings, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Subscribe to settings changes.
 * @param {(changes: object) => void} callback
 */
export function onSettingsChanged(callback) {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    callback(changes);
  });
}
