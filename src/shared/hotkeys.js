/**
 * Solve hotkey helpers — store, format, match keyboard shortcuts.
 */

/** @typedef {{ key: string, code: string, ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }} Hotkey */

/** Default solve shortcut: Ctrl+Shift+S */
export const DEFAULT_SOLVE_HOTKEY = {
  key: 's',
  code: 'KeyS',
  ctrl: true,
  alt: false,
  shift: true,
  meta: false,
};

/**
 * @param {Hotkey|null|undefined} hotkey
 * @returns {string}
 */
export function formatHotkey(hotkey) {
  const h = hotkey || DEFAULT_SOLVE_HOTKEY;
  const parts = [];
  if (h.ctrl) parts.push('Ctrl');
  if (h.alt) parts.push('Alt');
  if (h.shift) parts.push('Shift');
  if (h.meta) parts.push('Meta');

  let keyLabel = h.key || '';
  if (keyLabel.length === 1) {
    keyLabel = keyLabel.toUpperCase();
  } else if (keyLabel === ' ') {
    keyLabel = 'Space';
  }
  parts.push(keyLabel || h.code || '?');
  return parts.join('+');
}

/**
 * Build a hotkey from a KeyboardEvent (ignores pure modifier presses).
 * @param {KeyboardEvent} e
 * @returns {Hotkey|null}
 */
export function hotkeyFromEvent(e) {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;

  return {
    key: e.key.length === 1 ? e.key.toLowerCase() : e.key,
    code: e.code,
    ctrl: Boolean(e.ctrlKey),
    alt: Boolean(e.altKey),
    shift: Boolean(e.shiftKey),
    meta: Boolean(e.metaKey),
  };
}

/**
 * @param {KeyboardEvent} e
 * @param {Hotkey|null|undefined} hotkey
 * @returns {boolean}
 */
export function eventMatchesHotkey(e, hotkey) {
  const h = hotkey || DEFAULT_SOLVE_HOTKEY;
  if (!h || (!h.key && !h.code)) return false;

  // Avoid stealing keystrokes while typing in fields
  const t = e.target;
  if (
    t &&
    (t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      t.isContentEditable)
  ) {
    return false;
  }

  const keyOk =
    (h.key && e.key.toLowerCase() === String(h.key).toLowerCase()) ||
    (h.code && e.code === h.code);

  return (
    keyOk &&
    Boolean(e.ctrlKey) === Boolean(h.ctrl) &&
    Boolean(e.altKey) === Boolean(h.alt) &&
    Boolean(e.shiftKey) === Boolean(h.shift) &&
    Boolean(e.metaKey) === Boolean(h.meta)
  );
}

/**
 * Normalize a stored hotkey value (object or legacy string).
 * @param {unknown} value
 * @returns {Hotkey}
 */
export function normalizeHotkey(value) {
  if (value && typeof value === 'object' && (value.key || value.code)) {
    return {
      key: value.key || '',
      code: value.code || '',
      ctrl: Boolean(value.ctrl),
      alt: Boolean(value.alt),
      shift: Boolean(value.shift),
      meta: Boolean(value.meta),
    };
  }
  return { ...DEFAULT_SOLVE_HOTKEY };
}
