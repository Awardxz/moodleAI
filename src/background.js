/**
 * Background event page.
 * - Tab screenshots for vision capture
 * - Proxies AI API calls (avoids page CORS from content scripts)
 */

import { chatCompletion } from './shared/providers.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 70 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('[moodleAI] Capture error:', chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ dataUrl });
    });
    return true;
  }

  if (request.action === 'chatCompletion') {
    chatCompletion(request.payload)
      .then((answer) => sendResponse({ answer }))
      .catch((err) => sendResponse({ error: err.message || String(err) }));
    return true;
  }
});
