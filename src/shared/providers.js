/**
 * AI provider configurations and chat completion helpers.
 * Supports OpenAI-compatible APIs, Anthropic, and Gemini.
 */

export const PROVIDERS = {
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    type: 'openai',
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    models: {
      text: [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'meta-llama/llama-4-scout-17b-16e-instruct',
      ],
      vision: [
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'meta-llama/llama-4-maverick-17b-128e-instruct',
      ],
    },
    defaults: {
      text: 'llama-3.3-70b-versatile',
      vision: 'meta-llama/llama-4-scout-17b-16e-instruct',
    },
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    type: 'openai',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: {
      text: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
      vision: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini'],
    },
    defaults: {
      text: 'gpt-4o-mini',
      vision: 'gpt-4o-mini',
    },
  },
  anthropic: {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com/v1',
    type: 'anthropic',
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: {
      text: [
        'claude-sonnet-4-20250514',
        'claude-3-5-haiku-20241022',
        'claude-3-5-sonnet-20241022',
      ],
      vision: [
        'claude-sonnet-4-20250514',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
      ],
    },
    defaults: {
      text: 'claude-sonnet-4-20250514',
      vision: 'claude-sonnet-4-20250514',
    },
  },
  xai: {
    id: 'xai',
    name: 'Grok (xAI)',
    baseUrl: 'https://api.x.ai/v1',
    type: 'openai',
    keyPlaceholder: 'xai-...',
    docsUrl: 'https://console.x.ai/',
    models: {
      text: ['grok-3', 'grok-3-mini', 'grok-2-1212'],
      vision: ['grok-2-vision-1212'],
    },
    defaults: {
      text: 'grok-3-mini',
      vision: 'grok-2-vision-1212',
    },
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    type: 'openai',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    models: {
      text: ['deepseek-chat', 'deepseek-reasoner'],
      vision: [],
    },
    defaults: {
      text: 'deepseek-chat',
      vision: null,
    },
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    type: 'gemini',
    keyPlaceholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/apikey',
    models: {
      text: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'],
      vision: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'],
    },
    defaults: {
      text: 'gemini-2.0-flash',
      vision: 'gemini-2.0-flash',
    },
  },
};

export function getProvider(id) {
  return PROVIDERS[id] || PROVIDERS.groq;
}

export function supportsVision(providerId) {
  const p = getProvider(providerId);
  return Array.isArray(p.models.vision) && p.models.vision.length > 0;
}

/**
 * Parse a data URL into mime type + raw base64.
 * @param {string} dataUrl
 * @returns {{ mime: string, data: string }}
 */
export function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) {
    return { mime: 'image/jpeg', data: (dataUrl || '').replace(/^data:[^;]+;base64,/, '') };
  }
  return { mime: match[1], data: match[2] };
}

/**
 * Call the selected AI provider with optional image.
 * @param {object} opts
 * @param {string} opts.providerId
 * @param {string} opts.apiKey
 * @param {string} opts.model
 * @param {string} opts.systemPrompt
 * @param {string} opts.userText
 * @param {string|null} opts.imageDataUrl
 * @returns {Promise<string>}
 */
export async function chatCompletion({
  providerId,
  apiKey,
  model,
  systemPrompt,
  userText,
  imageDataUrl = null,
}) {
  if (!apiKey) {
    throw new Error('No API key configured. Open the extension popup and add your key.');
  }

  const provider = getProvider(providerId);
  const useVision = Boolean(imageDataUrl) && supportsVision(providerId);

  if (imageDataUrl && !useVision) {
    // Provider has no vision models — send text only with a note
    userText = `${userText}\n\n[Note: An image was present but ${provider.name} does not support vision in this extension. Answer from text only.]`;
  }

  switch (provider.type) {
    case 'openai':
      return callOpenAICompatible({
        baseUrl: provider.baseUrl,
        apiKey,
        model,
        systemPrompt,
        userText,
        imageDataUrl: useVision ? imageDataUrl : null,
      });
    case 'anthropic':
      return callAnthropic({
        apiKey,
        model,
        systemPrompt,
        userText,
        imageDataUrl: useVision ? imageDataUrl : null,
      });
    case 'gemini':
      return callGemini({
        apiKey,
        model,
        systemPrompt,
        userText,
        imageDataUrl: useVision ? imageDataUrl : null,
      });
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}

async function callOpenAICompatible({
  baseUrl,
  apiKey,
  model,
  systemPrompt,
  userText,
  imageDataUrl,
}) {
  const userContent = imageDataUrl
    ? [
        { type: 'text', text: userText },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ]
    : userText;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 256,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${errText.slice(0, 200) || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from API');
  return content;
}

async function callAnthropic({ apiKey, model, systemPrompt, userText, imageDataUrl }) {
  const content = [{ type: 'text', text: userText }];

  if (imageDataUrl) {
    const { mime, data } = parseDataUrl(imageDataUrl);
    content.unshift({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mime || 'image/jpeg',
        data,
      },
    });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Claude API ${response.status}: ${errText.slice(0, 200) || response.statusText}`);
  }

  const data = await response.json();
  const text = data.content?.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('Empty response from Claude');
  return text;
}

async function callGemini({ apiKey, model, systemPrompt, userText, imageDataUrl }) {
  const parts = [{ text: userText }];

  if (imageDataUrl) {
    const { mime, data } = parseDataUrl(imageDataUrl);
    parts.push({
      inline_data: {
        mime_type: mime || 'image/jpeg',
        data,
      },
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 256,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 200) || response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}
