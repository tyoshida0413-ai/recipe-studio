import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import recipesRouter from './routes/recipes.js';
import settingsRouter from './routes/settings.js';
import analyzeRouter from './routes/analyze.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// APIルート
app.use('/api/recipes', recipesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/analyze', analyzeRouter);

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🍳 RecipeAI Studio サーバー起動: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/health`);
});
