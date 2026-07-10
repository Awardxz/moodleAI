import { PROVIDERS, getProvider, supportsVision } from '../shared/providers.js';
import { DEFAULT_PROMPTS, SUBJECT_LABELS } from '../shared/prompts.js';
import { getSettings, saveSettings } from '../shared/storage.js';

const els = {
  enabledToggle: document.getElementById('enabledToggle'),
  providerSelect: document.getElementById('providerSelect'),
  providerMeta: document.getElementById('providerMeta'),
  apiKey: document.getElementById('apiKey'),
  toggleKey: document.getElementById('toggleKey'),
  keyHint: document.getElementById('keyHint'),
  keyStatus: document.getElementById('keyStatus'),
  textModel: document.getElementById('textModel'),
  visionModel: document.getElementById('visionModel'),
  subjectSelect: document.getElementById('subjectSelect'),
  systemPrompt: document.getElementById('systemPrompt'),
  saveBtn: document.getElementById('saveBtn'),
  status: document.getElementById('status'),
};

function fillProviders() {
  els.providerSelect.innerHTML = Object.values(PROVIDERS)
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join('');
}

function fillSubjects() {
  els.subjectSelect.innerHTML = Object.entries(SUBJECT_LABELS)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
}

function fillModels(providerId, selectedText, selectedVision) {
  const p = getProvider(providerId);

  els.textModel.innerHTML = p.models.text
    .map((m) => `<option value="${m}">${m}</option>`)
    .join('');

  if (p.models.vision.length) {
    els.visionModel.disabled = false;
    els.visionModel.innerHTML = p.models.vision
      .map((m) => `<option value="${m}">${m}</option>`)
      .join('');
  } else {
    els.visionModel.disabled = true;
    els.visionModel.innerHTML = `<option value="">Not supported</option>`;
  }

  if (selectedText && p.models.text.includes(selectedText)) {
    els.textModel.value = selectedText;
  } else {
    els.textModel.value = p.defaults.text;
  }

  if (p.models.vision.length) {
    if (selectedVision && p.models.vision.includes(selectedVision)) {
      els.visionModel.value = selectedVision;
    } else {
      els.visionModel.value = p.defaults.vision;
    }
  }
}

function updateProviderMeta(providerId) {
  const p = getProvider(providerId);
  const vision = supportsVision(providerId);

  els.providerMeta.innerHTML = `
    <span class="chip">${p.type === 'openai' ? 'OAI_COMPAT' : p.type.toUpperCase()}</span>
    <span class="chip ${vision ? 'vision' : 'no-vision'}">${vision ? 'VISION_OK' : 'TEXT_ONLY'}</span>
  `;

  els.apiKey.placeholder = p.keyPlaceholder || 'paste_key_here';
  els.keyHint.innerHTML = `key source: <a href="${p.docsUrl}" target="_blank" rel="noopener">${p.name}</a> · local storage only`;
}

function updateKeyStatus() {
  const hasKey = Boolean(els.apiKey.value.trim());
  els.keyStatus.textContent = hasKey ? 'KEY_OK' : 'NO_KEY';
  els.keyStatus.className = `badge ${hasKey ? 'ok' : 'warn'}`;
}

function showStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.add('show');
  els.status.classList.toggle('error', isError);
  setTimeout(() => {
    els.status.classList.remove('show');
  }, 2400);
}

async function load() {
  fillProviders();
  fillSubjects();

  const s = await getSettings();

  els.enabledToggle.checked = s.enabled !== false;
  els.providerSelect.value = s.provider || 'groq';
  els.apiKey.value = s.apiKey || '';
  els.subjectSelect.value = s.subject || 'Unified';
  els.systemPrompt.value = s.customPrompt || DEFAULT_PROMPTS.Unified || '';

  fillModels(els.providerSelect.value, s.textModel, s.visionModel);
  updateProviderMeta(els.providerSelect.value);
  updateKeyStatus();
}

els.providerSelect.addEventListener('change', () => {
  const id = els.providerSelect.value;
  fillModels(id, null, null);
  updateProviderMeta(id);
});

els.subjectSelect.addEventListener('change', () => {
  const subject = els.subjectSelect.value;
  if (subject !== 'Custom' && DEFAULT_PROMPTS[subject] !== undefined) {
    els.systemPrompt.value = DEFAULT_PROMPTS[subject];
  }
});

els.apiKey.addEventListener('input', updateKeyStatus);

els.toggleKey.addEventListener('click', () => {
  const isHidden = els.apiKey.type === 'password';
  els.apiKey.type = isHidden ? 'text' : 'password';
  els.toggleKey.textContent = isHidden ? 'Hide' : 'Show';
});

els.saveBtn.addEventListener('click', async () => {
  const providerId = els.providerSelect.value;
  const provider = getProvider(providerId);

  const payload = {
    enabled: els.enabledToggle.checked,
    provider: providerId,
    apiKey: els.apiKey.value.trim(),
    textModel: els.textModel.value || provider.defaults.text,
    visionModel: els.visionModel.value || provider.defaults.vision || provider.defaults.text,
    subject: els.subjectSelect.value,
    customPrompt: els.systemPrompt.value,
  };

  try {
    await saveSettings(payload);
    updateKeyStatus();
    showStatus('>> SAVED');
  } catch (err) {
    showStatus(err.message || 'SAVE_FAIL', true);
  }
});

load();
