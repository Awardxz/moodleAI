/**
 * Smart image capture for Moodle questions.
 *
 * Strategy (best → fallback):
 * 1. Draw the question <img> onto a canvas (clean, no UI chrome)
 * 2. Capture visible tab and crop to the question container bounds
 * 3. Capture visible tab full-frame as last resort
 */

/**
 * Capture the best available image for a question.
 * @param {Element} questionRoot - usually .qtext or parent .que
 * @param {HTMLImageElement|null} imgEl
 * @returns {Promise<string|null>} data URL (jpeg) or null
 */
export async function captureQuestionImage(questionRoot, imgEl) {
  // 1. Prefer direct image element capture
  if (imgEl) {
    const fromImg = await tryCaptureImageElement(imgEl);
    if (fromImg) {
      console.log('[moodleAI] Captured image via canvas drawImage');
      return fromImg;
    }
  }

  // 2. Crop screenshot to the question region
  const cropTarget = resolveCropTarget(questionRoot, imgEl);
  if (cropTarget) {
    try {
      const full = await requestTabCapture();
      if (full) {
        const cropped = await cropDataUrlToElement(full, cropTarget);
        if (cropped) {
          console.log('[moodleAI] Captured image via cropped tab screenshot');
          return cropped;
        }
      }
    } catch (err) {
      console.warn('[moodleAI] Cropped capture failed:', err);
    }
  }

  // 3. Full visible tab
  try {
    const full = await requestTabCapture();
    if (full) {
      console.log('[moodleAI] Captured full visible tab');
      return full;
    }
  } catch (err) {
    console.error('[moodleAI] Tab capture failed:', err);
  }

  return null;
}

/**
 * @param {HTMLImageElement} img
 * @returns {Promise<string|null>}
 */
async function tryCaptureImageElement(img) {
  try {
    // Wait for decode if needed
    if (!img.complete || img.naturalWidth === 0) {
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('image load timeout')), 4000);
        img.onload = () => {
          clearTimeout(t);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(t);
          reject(new Error('image load error'));
        };
        // Force reload attempt if src exists
        if (img.src) {
          // no-op; wait for existing load
        }
      }).catch(() => null);
    }

    if (!img.naturalWidth || !img.naturalHeight) return null;

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // toDataURL throws on tainted canvas (cross-origin without CORS)
    return canvas.toDataURL('image/jpeg', 0.88);
  } catch {
    return null;
  }
}

/**
 * @param {Element} questionRoot
 * @param {HTMLImageElement|null} imgEl
 * @returns {Element|null}
 */
function resolveCropTarget(questionRoot, imgEl) {
  // Prefer the image itself for a tight crop; else the question block
  if (imgEl && imgEl.getBoundingClientRect().width > 20) return imgEl;

  const que = questionRoot?.closest?.('.que') || questionRoot;
  if (que && que.getBoundingClientRect().height > 20) return que;

  return questionRoot || null;
}

/**
 * @returns {Promise<string>}
 */
function requestTabCapture() {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      reject(new Error('chrome.runtime unavailable'));
      return;
    }
    chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.dataUrl) {
        reject(new Error(response?.error || 'Failed to capture screenshot'));
        return;
      }
      resolve(response.dataUrl);
    });
  });
}

/**
 * Crop a full-page screenshot data URL to an element's viewport bounds.
 * @param {string} dataUrl
 * @param {Element} el
 * @returns {Promise<string|null>}
 */
function cropDataUrlToElement(dataUrl, el) {
  return new Promise((resolve) => {
    const rect = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Expand slightly so we don't clip edges
    const pad = 8;
    const sx = Math.max(0, (rect.left - pad) * dpr);
    const sy = Math.max(0, (rect.top - pad) * dpr);
    const sw = Math.max(1, (rect.width + pad * 2) * dpr);
    const sh = Math.max(1, (rect.height + pad * 2) * dpr);

    const img = new Image();
    img.onload = () => {
      try {
        // Clamp to image bounds
        const cx = Math.min(sx, img.width - 1);
        const cy = Math.min(sy, img.height - 1);
        const cw = Math.min(sw, img.width - cx);
        const ch = Math.min(sh, img.height - cy);

        if (cw < 10 || ch < 10) {
          resolve(dataUrl);
          return;
        }

        const canvas = document.createElement('canvas');
        // Downscale very large crops for API token efficiency
        const maxDim = 1600;
        let outW = cw;
        let outH = ch;
        if (outW > maxDim || outH > maxDim) {
          const scale = maxDim / Math.max(outW, outH);
          outW = Math.round(outW * scale);
          outH = Math.round(outH * scale);
        }

        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, cx, cy, cw, ch, 0, 0, outW, outH);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        console.warn('[moodleAI] crop failed', e);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
