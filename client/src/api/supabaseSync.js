/**
 * Supabase 軽量同期クライアント
 * テーブル名: recipe_studio_recipes（RecipeAI Studio専用）
 * npmパッケージ不要で、ブラウザ標準のfetchとPostgREST APIで直接通信します。
 */

const TABLE_NAME = 'recipe_studio_recipes';

export const supabaseSync = {
  // レシピ一覧取得
  async fetchRecipes(supabaseUrl, supabaseKey, syncKey) {
    if (!supabaseUrl || !supabaseKey || !syncKey) return null;

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${TABLE_NAME}?sync_key=eq.${encodeURIComponent(syncKey)}&order=updated_at.desc`;

    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Supabase取得エラー: ${res.status}`);
    }

    const rows = await res.json();
    return rows.map((row) => ({
      ...row.data,
      id: row.id,
      updatedAt: row.updated_at,
    }));
  },

  // レシピ保存・更新（Upsert）
  async saveRecipe(supabaseUrl, supabaseKey, syncKey, recipe) {
    if (!supabaseUrl || !supabaseKey || !syncKey) return;

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${TABLE_NAME}`;

    const payload = {
      id: recipe.id,
      sync_key: syncKey,
      data: recipe,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates', // 存在する場合は更新
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Supabase保存エラー: ${res.status}`);
    }
  },

  // レシピ削除
  async deleteRecipe(supabaseUrl, supabaseKey, syncKey, recipeId) {
    if (!supabaseUrl || !supabaseKey || !syncKey) return;

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(recipeId)}&sync_key=eq.${encodeURIComponent(syncKey)}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Supabase削除エラー: ${res.status}`);
    }
  },

  // 接続テスト
  async testConnection(supabaseUrl, supabaseKey) {
    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${TABLE_NAME}?select=id&limit=1`;
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `接続エラー: ステータス ${res.status}`);
    }
    return true;
  },
};
