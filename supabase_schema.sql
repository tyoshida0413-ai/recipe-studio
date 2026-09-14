-- ===================================================
-- RecipeAI Studio: Supabase 同期用テーブル定義
-- テーブル名: recipe_studio_recipes（他アプリと絶対に被らない専用命名）
-- Supabase の「SQL Editor」に貼り付けて「Run」を実行してください
-- ===================================================

CREATE TABLE IF NOT EXISTS public.recipe_studio_recipes (
    id TEXT PRIMARY KEY,
    sync_key TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成（同期キーでの検索高速化）
CREATE INDEX IF NOT EXISTS idx_recipe_studio_recipes_sync_key ON public.recipe_studio_recipes (sync_key);
CREATE INDEX IF NOT EXISTS idx_recipe_studio_recipes_updated_at ON public.recipe_studio_recipes (updated_at DESC);

-- Row Level Security (RLS) を有効化
ALTER TABLE public.recipe_studio_recipes ENABLE ROW LEVEL SECURITY;

-- 匿名アクセス用ポリシー（専用テーブルへのアクセスを許可）
CREATE POLICY "Allow anon select by sync_key for recipe_studio" 
ON public.recipe_studio_recipes FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anon insert by sync_key for recipe_studio" 
ON public.recipe_studio_recipes FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Allow anon update by sync_key for recipe_studio" 
ON public.recipe_studio_recipes FOR UPDATE 
TO anon 
USING (true);

CREATE POLICY "Allow anon delete by sync_key for recipe_studio" 
ON public.recipe_studio_recipes FOR DELETE 
TO anon 
USING (true);
