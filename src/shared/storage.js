/**
 * Chrome storage helpers for extension settings.
 */

import { DEFAULT_PROMPTS } from './prompts.js';
import { getProvider } from './providers.js';
import { DEFAULT_SOLVE_HOTKEY, normalizeHotkey } from './hotkeys.js';
import {
  DEFAULT_SELECTORS,
  getThemePreset,
  normalizeSelectors,
} from './selectors.js';

export const STORAGE_KEYS = {
  provider: 'provider',
  apiKey: 'apiKey',
  textModel: 'textModel',
  visionModel: 'visionModel',
  subject: 'subject',
  customPrompt: 'customPrompt',
  enabled: 'enabled',
  solveMode: 'solveMode',
  solveHotkey: 'solveHotkey',
  themeProfile: 'themeProfile',
  selectors: 'selectors',
};

/** @typedef {'auto'|'manual'} SolveMode */

const DEFAULTS = {
  provider: 'groq',
  apiKey: '',
  textModel: '',
  visionModel: '',
  subject: 'Unified',
  customPrompt: DEFAULT_PROMPTS.Unified,
  enabled: true,
  solveMode: 'auto',
  solveHotkey: { ...DEFAULT_SOLVE_HOTKEY },
  themeProfile: 'standard',
  selectors: { ...DEFAULT_SELECTORS },
};

/**
 * Prefer last-saved selector strings; fall back to the named preset, then defaults.
 * @param {string} themeProfile
 * @param {object} [storedSelectors]
 */
function resolveSelectors(themeProfile, storedSelectors) {
  if (storedSelectors && typeof storedSelectors === 'object') {
    return normalizeSelectors(storedSelectors);
  }
  return normalizeSelectors(getThemePreset(themeProfile).selectors);
}

/**
 * @returns {Promise<object>}
 */
export function getSettings() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve({
        ...DEFAULTS,
        solveHotkey: { ...DEFAULT_SOLVE_HOTKEY },
        selectors: { ...DEFAULT_SELECTORS },
      });
      return;
    }

    chrome.storage.local.get(Object.values(STORAGE_KEYS), (result) => {
      const providerId = result.provider || DEFAULTS.provider;
      const provider = getProvider(providerId);
      const solveMode = result.solveMode === 'manual' ? 'manual' : 'auto';
      const themeProfile = result.themeProfile || DEFAULTS.themeProfile;

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
        solveMode,
        solveHotkey: normalizeHotkey(result.solveHotkey),
        themeProfile,
        selectors: resolveSelectors(themeProfile, result.selectors),
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
