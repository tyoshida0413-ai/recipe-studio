import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRecipe } from '../db/database.js';
import { fetchYouTubeData } from '../services/youtube.js';
import { analyzeYouTubeTranscript, analyzeText, generateRecipe } from '../services/aiAnalyzer.js';

const router = Router();

// YouTube URL → 字幕取得 → AI解析 → レシピ生成
router.post('/youtube', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'YouTube URLを入力してください。' });
    }

    // Step 1: YouTube字幕・メタデータ取得
    const ytData = await fetchYouTubeData(url);

    // Step 2: AI解析（構造化レシピJSON抽出）
    const recipeData = await analyzeYouTubeTranscript(
      ytData.transcript.text,
      ytData.metadata
    );

    // Step 3: レシピをDBに保存
    const recipe = {
      id: `rec_yt_${uuidv4().slice(0, 8)}`,
      ...recipeData,
      coverImage: ytData.metadata.thumbnailUrl,
      sourceType: 'yt',
      sourceBadge: '▶ YouTube動画',
      sourceName: `${ytData.metadata.authorName} ↗`,
      sourceUrl: `https://www.youtube.com/watch?v=${ytData.videoId}`,
      youtubeId: ytData.videoId,
      rawContent: ytData.transcript.text.slice(0, 5000),
    };

    const saved = createRecipe(recipe);
    res.json({ recipe: saved, message: 'YouTubeからレシピを自動生成しました！' });
  } catch (err) {
    console.error('YouTube analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

// テキスト/メモ → AI解析 → レシピ生成
router.post('/text', async (req, res) => {
  try {
    const { text, imageUrl, sourceType = 'memo' } = req.body;
    if (!text && !imageUrl) {
      return res.status(400).json({ error: 'テキストまたは画像URLを入力してください。' });
    }

    // AI解析
    const recipeData = await analyzeText(text || '', imageUrl);

    const sourceBadges = {
      memo: '📝 メモ解析',
      x: '𝕏 ポスト解析',
    };

    // レシピをDBに保存
    const recipe = {
      id: `rec_${sourceType}_${uuidv4().slice(0, 8)}`,
      ...recipeData,
      sourceType,
      sourceBadge: sourceBadges[sourceType] || '📝 テキスト解析',
      sourceName: 'ユーザー入力テキストから解析',
      rawContent: (text || '').slice(0, 5000),
    };

    const saved = createRecipe(recipe);
    res.json({ recipe: saved, message: 'テキストからレシピを自動生成しました！' });
  } catch (err) {
    console.error('Text analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AIゼロベース レシピ生成
router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'レシピの要望を入力してください。' });
    }

    // AI生成
    const recipeData = await generateRecipe(prompt);

    // レシピをDBに保存
    const recipe = {
      id: `rec_ai_${uuidv4().slice(0, 8)}`,
      ...recipeData,
      sourceType: 'ai',
      sourceBadge: '🤖 AI生成',
      sourceName: 'AIオリジナルレシピ',
      rawContent: prompt,
    };

    const saved = createRecipe(recipe);
    res.json({ recipe: saved, message: 'AIがオリジナルレシピを考案しました！' });
  } catch (err) {
    console.error('Generate recipe error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
