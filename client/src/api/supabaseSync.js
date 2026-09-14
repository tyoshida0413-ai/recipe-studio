/**
 * Supabase 軽量同期クライアント（最新仕様準拠）
 * - Supabase公式最新の Publishable Key (sb_publishable_...) に完全対応
 * - レガシーキー (anon: eyJ...) も下位互換対応
 * - テーブル名: recipe_studio_recipes（RecipeAI Studio専用）
 * - npmパッケージ不要で、ブラウザ標準のfetchとPostgREST APIで直接高速通信
 */

const TABLE_NAME = 'recipe_studio_recipes';

/**
 * リクエストヘッダー生成ヘルパー
 * ※ 最新の Publishable Key (sb_publishable_...) は JWT ではないため、
 *    Authorization: Bearer を付けるとプラットフォーム側で Invalid JWT エラーになります。
 *    apikey ヘッダーのみを送信するのが Supabase 公式の最新仕様です。
 */
function buildHeaders(supabaseKey, extra = {}) {
  const cleanKey = (supabaseKey || '').trim();
  const headers = {
    'apikey': cleanKey,
    'Content-Type': 'application/json',
    ...extra,
  };

  // レガシーJWTキー（eyJ...）の場合のみ Authorization Bearer を付与
  if (cleanKey.startsWith('eyJ')) {
    headers['Authorization'] = `Bearer ${cleanKey}`;
  }

  return headers;
}

export const supabaseSync = {
  // レシピ一覧取得
  async fetchRecipes(supabaseUrl, supabaseKey, syncKey) {
    if (!supabaseUrl || !supabaseKey || !syncKey) return null;

    const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    const url = `${cleanUrl}/rest/v1/${TABLE_NAME}?sync_key=eq.${encodeURIComponent(syncKey.trim())}&order=updated_at.desc`;

    const res = await fetch(url, {
      headers: buildHeaders(supabaseKey),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Supabase取得エラー: HTTP ${res.status}`);
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

    const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    const url = `${cleanUrl}/rest/v1/${TABLE_NAME}`;

    const payload = {
      id: recipe.id,
      sync_key: syncKey.trim(),
      data: recipe,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(supabaseKey, {
        'Prefer': 'resolution=merge-duplicates', // 重複時は更新
      }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Supabase保存エラー: HTTP ${res.status}`);
    }
  },

  // レシピ削除
  async deleteRecipe(supabaseUrl, supabaseKey, syncKey, recipeId) {
    if (!supabaseUrl || !supabaseKey || !syncKey) return;

    const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    const url = `${cleanUrl}/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(recipeId)}&sync_key=eq.${encodeURIComponent(syncKey.trim())}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(supabaseKey),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Supabase削除エラー: HTTP ${res.status}`);
    }
  },

  // 接続テスト
  async testConnection(supabaseUrl, supabaseKey) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL と API Key を入力してください');
    }

    const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    const url = `${cleanUrl}/rest/v1/${TABLE_NAME}?select=id&limit=1`;

    const res = await fetch(url, {
      headers: buildHeaders(supabaseKey),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        throw new Error(`APIキーが無効または権限がありません（HTTP ${res.status}）: ${err.message || ''}`);
      }
      if (res.status === 404) {
        throw new Error(`テーブル「${TABLE_NAME}」が見つかりません。SupabaseのSQL Editorでテーブル作成スクリプトを実行してください。`);
      }
      throw new Error(err.message || `接続エラー: HTTP ${res.status}`);
    }
    return true;
  },
};
