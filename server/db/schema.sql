-- RecipeAI Studio - SQLite Schema
-- レシピ自動作成アプリ データベーススキーマ定義

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  cover_image TEXT,
  source_type TEXT NOT NULL DEFAULT 'ai',  -- 'yt', 'x', 'memo', 'ai'
  source_badge TEXT,
  source_name TEXT,
  source_url TEXT,
  youtube_id TEXT,
  cooking_time TEXT,
  base_servings INTEGER DEFAULT 2,
  group_key TEXT DEFAULT 'other',
  group_name TEXT DEFAULT '📁 その他',
  is_favorite INTEGER DEFAULT 0,
  my_arrangement TEXT,
  crosscheck TEXT,
  ingredients TEXT NOT NULL DEFAULT '[]',   -- JSON array
  steps TEXT NOT NULL DEFAULT '[]',         -- JSON array
  raw_content TEXT,                         -- 解析前の元データ
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- グループ一覧テーブル（ユーザーカスタマイズ可能）
CREATE TABLE IF NOT EXISTS groups (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- デフォルトグループを挿入
INSERT OR IGNORE INTO groups (key, name, sort_order) VALUES
  ('pasta', '🍝 パスタ系', 1),
  ('nabe', '🍲 鍋・汁物系', 2),
  ('rice', '🍚 ご飯・丼系', 3),
  ('meat', '🥩 肉料理', 4),
  ('side', '🥗 副菜・作り置き', 5),
  ('other', '📁 その他', 99);
