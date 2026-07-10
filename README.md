# moodleAI

**Open-source browser extension** that helps you work through Moodle quiz questions using your own AI API keys. It reads the on-page question (and optional images), calls the provider you configure, and shows a discreet answer under the options.

> **Browser support:** moodleAI has been **tested only on Firefox** (temporary add-on / `about:debugging`). Other Chromium browsers may work because the project uses Manifest V2 APIs, but they are **not officially verified**.

---

## Features

| Feature | Description |
|--------|-------------|
| **Multi-provider AI** | Groq, OpenAI, Claude (Anthropic), Grok (xAI), DeepSeek, Google Gemini |
| **Your keys only** | API keys stay in local extension storage — no accounts or relay server required |
| **Free-tier path** | **Groq** is the recommended free / low-cost route |
| **Vision support** | Image questions via canvas capture or cropped tab screenshot |
| **Discreet UI** | Answers render at near-invisible gray opacity; toggle with `"` |
| **Subject profiles** | Java, Databases, Algorithms, Networks, Unified, or a custom system prompt |
| **Pixel settings popup** | Dark monochrome HUD to configure provider, models, and prompts |

---

## Free tier: Groq (recommended)

If you want to try moodleAI **without paid API bills**, use **[Groq](https://console.groq.com/)**:

1. Create a free account at [console.groq.com](https://console.groq.com/)
2. Generate an API key under **API Keys**
3. In the extension popup, set **Provider → Groq**, paste the key, and save

Groq offers a **generous free tier** with fast inference. For questions that include images, pick a **vision-capable** model in the popup (e.g. Llama 4 Scout). Rate limits and model availability depend on Groq’s current free-tier policy — check their console for the latest limits.

| Goal | Suggested setup |
|------|-----------------|
| Free / cheapest to start | **Groq** + free API key |
| Strongest general quality | OpenAI / Claude / Gemini (paid) |
| Text-only budget alternative | DeepSeek (no vision in this extension) |

---

## Showcase — how it works

End-to-end flow when you open a Moodle quiz attempt:

```
┌─────────────────────────────────────────────────────────────────┐
│  Moodle page (.qtext / .ablock)                                 │
│                                                                 │
│  1. Content script polls for a new question                     │
│  2. Parse text, MC options, dropdowns                           │
│  3. If image present → smart capture                            │
│        • Prefer: draw <img> to canvas                           │
│        • Fallback: tab screenshot cropped to question region    │
│  4. Background script calls your chosen AI API                  │
│        (avoids page CORS; key never leaves your browser)        │
│  5. Inject answer under options as gray text (opacity: 0.1)     │
│  6. Press " to hide/show the answer                             │
└─────────────────────────────────────────────────────────────────┘
```

### What you see on the page

| Step | Behavior |
|------|----------|
| Question loads | Extension detects Moodle markup (`.qtext`) |
| Processing | Request goes to the provider selected in settings |
| Answer ready | Appended under the options block as **near-invisible gray** (`opacity: 0.1`) |
| Toggle | Press **`"`** (quote key) to switch between `0.1` and fully hidden (`0`) |

The answer style is intentional: readable if you know where to look, easy to hide during a glance.

### Architecture (high level)

```
src/popup/          →  configure provider, key, models, prompt
src/content/        →  detect question, capture image, show answer
src/background.js   →  screenshot + proxy API calls
src/shared/         →  providers, prompts, storage helpers
```

Built output lands in `dist/` (`content`, `popup`, `background` bundles).

---

## How to use

### Prerequisites

- **Firefox** (tested browser)
- **Node.js** 18+ and npm
- An API key (start with **Groq** for free tier)

### 1. Clone and build

```bash
git clone https://github.com/YOUR_USERNAME/moodleai.git
cd moodleai
npm install
npm run build
```

### 2. Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select this project’s `manifest.json`

> Temporary add-ons in Firefox are cleared when the browser restarts. Reload the add-on (or use a development workflow) after each restart while developing.

### 3. Configure the extension

1. Click the **moodleAI** toolbar icon  
2. Turn the extension **ON**  
3. Choose a **provider** (use **Groq** for free tier)  
4. Paste your **API key**  
5. Select **text** and **vision** models  
6. Pick a **subject profile** or edit the system prompt  
7. Click **`[ SAVE_SETTINGS ]`**

### 4. Use on a quiz

1. Open a Moodle quiz attempt that uses standard question markup  
2. Wait a few seconds after the question appears  
3. Look under the options for the faint gray answer  
4. Press **`"`** to hide or show it  

### 5. Local test page (optional)

```bash
# After build + load extension, open in Firefox:
# test/demo.html  (Moodle-like markup for dry runs)
```

---

## Supported providers

| Provider | Vision | Notes |
|----------|--------|--------|
| **[Groq](https://console.groq.com/keys)** | Yes | **Recommended free tier**; fast Llama models |
| [OpenAI](https://platform.openai.com/api-keys) | Yes | `gpt-4o` / `gpt-4o-mini` |
| [Claude (Anthropic)](https://console.anthropic.com/settings/keys) | Yes | Anthropic Messages API |
| [Grok (xAI)](https://console.x.ai/) | Yes | OpenAI-compatible API |
| [DeepSeek](https://platform.deepseek.com/api_keys) | No | Text only in this extension |
| [Google Gemini](https://aistudio.google.com/apikey) | Yes | AI Studio API keys |

Keys are stored only in **local extension storage** on your machine. Requests go **directly** from the extension to the provider — there is no moodleAI backend holding your key.

---

## Project structure

```
moodleai/
├── manifest.json              # Extension manifest (MV2)
├── package.json
├── webpack.config.js
├── README.md
├── src/
│   ├── background.js          # Screenshots + AI request proxy
│   ├── content/               # Page script (parse, capture, display)
│   ├── popup/                 # Settings UI (HTML / CSS / JS + fonts)
│   ├── shared/                # Providers, prompts, storage
│   └── server/                # Optional local OCR / image helper
├── dist/                      # Generated bundles (npm run build)
└── test/
    └── demo.html              # Local Moodle-like fixture
```

---

## Development

| Command | Description |
|---------|-------------|
| `npm run build` | Production build (content script lightly obfuscated) |
| `npm run build:dev` | Development build with source maps |
| `npm run build:watch` | Rebuild on file changes |
| `npm run server` | Optional local helper (`localhost:3000`) |
| `npm run dev` | Dev build + helper server |

### Optional helper server

Not required for normal use. Useful for local OCR experiments or CORS-bypassing image fetch:

```bash
npm run server
```

| Endpoint | Description |
|----------|-------------|
| `POST /api/ocr` | OCR an uploaded image |
| `GET /api/ocr?imageUrl=` | OCR a remote image URL |
| `GET /api/image-to-base64?url=` | Return image as a data URL |

---

## Privacy & security

- API keys are **never** committed to this repository — use the popup only  
- Keys live in browser local storage for the current profile  
- Network traffic goes to the AI provider you selected, not a third-party moodleAI server  
- If you fork or publish builds, **rotate any keys** that ever appeared in git history  

---

## Responsible use

This project is published for **education, research, and personal tooling**. Using automated assistance during graded assessments may violate your institution’s academic integrity policy. **You are responsible** for how you use the software.

---

## Contributing

Contributions are welcome.

1. Fork the repository  
2. Create a branch (`feature/…` or `fix/…`)  
3. Run `npm run build` and smoke-test on **Firefox**  
4. Open a pull request with a clear description of the change  

Please avoid committing secrets, personal API keys, or environment files.

### Ideas for contributors

- Broader browser testing (Chrome / Edge permanent install flow)  
- Manifest V3 migration  
- Additional providers or models  
- Improved Moodle theme / DOM selectors  
- Accessibility and localization  

---

## License

[ISC](./package.json) — free to use, modify, and distribute. See package metadata for details.

---

## Disclaimer

moodleAI is provided **as is**, without warranty. Provider APIs, free-tier limits, and Moodle page structure can change without notice. **Firefox is the only browser used for testing** at the time of this release.
