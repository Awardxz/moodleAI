/**
 * Optional local helper server for OCR / image CORS bypass.
 * The extension works without this when using vision-capable providers.
 *
 * Start: npm run server
 * Outdated Since : 13/12/2025
 */

const express = require('express');
const Tesseract = require('tesseract.js');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');

const upload = multer();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(cors());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'moodleAI helper' });
});

app.post('/api/ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const {
      data: { text },
    } = await Tesseract.recognize(req.file.buffer, 'eng', {
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      preserve_interword_spaces: '1',
    });

    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ocr', async (req, res) => {
  try {
    const imageUrl = req.query.imageUrl;
    if (!imageUrl) {
      return res.status(400).json({ error: 'No imageUrl provided' });
    }

    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');

    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, 'eng');

    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Fetch a remote image and return as a data URL (bypasses page CORS). */
app.get('/api/image-to-base64', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).json({ error: 'No url provided' });
    }

    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');
    const contentType = response.headers['content-type'] || 'image/png';
    const base64 = `data:${contentType};base64,${imageBuffer.toString('base64')}`;

    res.json({ base64 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`moodleAI helper server at http://localhost:${port}`);
});
