import { Router } from 'express';
import { getAllSettings, getSetting, setSetting } from '../db/database.js';

const router = Router();

// 設定取得（APIキーはマスク表示）
router.get('/', (req, res) => {
  try {
    const settings = getAllSettings();
    // APIキーをマスク
    const masked = {};
    for (const [key, value] of Object.entries(settings)) {
      if (key.includes('api_key') && value) {
        masked[key] = value.slice(0, 8) + '...' + value.slice(-4);
      } else {
        masked[key] = value;
      }
    }
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// APIキーが設定されているかチェック
router.get('/status', (req, res) => {
  try {
    const openaiKey = getSetting('openai_api_key');
    res.json({
      openai: !!openaiKey,
      gemini: !!getSetting('gemini_api_key'),
      claude: !!getSetting('claude_api_key'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 設定更新
router.put('/', (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null && value !== '') {
        setSetting(key, value);
      }
    }
    // マスクした設定を返す
    const settings = getAllSettings();
    const masked = {};
    for (const [key, value] of Object.entries(settings)) {
      if (key.includes('api_key') && value) {
        masked[key] = value.slice(0, 8) + '...' + value.slice(-4);
      } else {
        masked[key] = value;
      }
    }
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
