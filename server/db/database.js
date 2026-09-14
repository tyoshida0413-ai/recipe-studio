import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'recipes.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// データディレクトリが存在しない場合は作成
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// WALモードとパフォーマンス最適化
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// スキーマ適用
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// サンプルデータの初期投入
seedInitialData();

function seedInitialData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM recipes').get().count;
  if (count > 0) return;

  const sampleRecipes = [
    {
      id: "rec_yt_01",
      title: "至高のペペロンチーノ",
      cover_image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80",
      source_type: "yt",
      source_badge: "▶ YouTube動画",
      source_name: "料理研究家リュウジのバズレシピ ↗",
      source_url: "https://www.youtube.com/watch?v=F5kZ9mC8q1g",
      youtube_id: "F5kZ9mC8q1g",
      cooking_time: "15分",
      base_servings: 1,
      group_key: "pasta",
      group_name: "🍝 パスタ系",
      is_favorite: 1,
      my_arrangement: "初回調理時：少し塩気が強かったので、パスタを茹でるお湯の塩分を少し控えめにするとちょうど良い。ニンニクは包丁の腹で潰してからみじん切りにすると香りが格段にアップする！",
      crosscheck: JSON.stringify({
        hasDiff: true,
        title: "AI相互照合完了",
        desc: "概要欄（塩 小さじ1）と動画内発言（02:15 塩 小さじ1/2）の差異を検知し、水分蒸発を考慮した動画発言を優先採用しました。"
      }),
      ingredients: JSON.stringify([
        { name: "パスタ (1.4〜1.6mm)", baseAmount: 100, unit: "g" },
        { name: "にんにく", baseAmount: 2, unit: "片" },
        { name: "オリーブオイル", baseAmount: 2, unit: "大さじ" },
        { name: "赤唐辛子（輪切り）", baseAmount: 1, unit: "本分" },
        { name: "塩（茹で用・味付け）", baseAmount: 0.5, unit: "小さじ" },
        { name: "水", baseAmount: 350, unit: "ml" },
        { name: "味の素", baseAmount: 4, unit: "振り" }
      ]),
      steps: JSON.stringify([
        {
          num: 1,
          timeSec: 35,
          timeDisplay: "00:35",
          timerSeconds: 0,
          usedIngredients: [{ name: "にんにく", amount: "2片" }],
          text: "にんにくは皮を剥き、薄切りまたは粗みじん切りにする。芯はそのままでOK。",
          technique: "【にんにくの切り方】包丁の腹で一度軽く押し潰してから刻むと、細胞が適度に壊れてオイルへ香りが豊かに溶け出します。",
          stepImage: "https://images.unsplash.com/photo-1620894560373-1087114188b2?w=600&q=80",
          tip: "細かく切りすぎるとオイルの中で焦げやすくなるため、少し粗めのみじん切りが理想です。"
        },
        {
          num: 2,
          timeSec: 85,
          timeDisplay: "01:25",
          timerSeconds: 120,
          usedIngredients: [
            { name: "オリーブオイル", amount: "大さじ2" },
            { name: "赤唐辛子（輪切り）", amount: "1本分" }
          ],
          text: "冷たいフライパンにオリーブオイルとにんにくを入れ、弱火でじっくり熱してオイルに香りを移す。",
          technique: "【火加減のコツ】フライパンを少し傾けてオイル溜まりを作り、そこでにんにくを揚げるように加熱すると均一に火が通ります。",
          stepImage: "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600&q=80",
          tip: "決して焦がさないよう弱火をキープ。にんにくがきつね色になったら火を止めて唐辛子を加えます。"
        },
        {
          num: 3,
          timeSec: 135,
          timeDisplay: "02:15",
          timerSeconds: 300,
          usedIngredients: [
            { name: "パスタ", amount: "100g" },
            { name: "水", amount: "350ml" },
            { name: "塩", amount: "小さじ1/2" },
            { name: "味の素", amount: "4振り" }
          ],
          text: "水350ml、塩小さじ1/2、味の素を入れ沸騰させ、パスタをそのまま投入して茹でる（ワンパン調理）。",
          technique: "【ワンパンのポイント】パスタがスープを吸いながらアルデンテになるよう、沸騰を維持できる中火にします。",
          stepImage: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80",
          tip: "【クロスチェック補正箇所】概要欄には小さじ1とありますが、動画発言通りの小さじ1/2がベストです。"
        }
      ]),
      raw_content: "YouTube動画解析データ"
    },
    {
      id: "rec_x_02",
      title: "本場ローマ風 濃厚カルボナーラ",
      cover_image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80",
      source_type: "x",
      source_badge: "𝕏 ポスト解析",
      source_name: "イタリア料理人Xアカウント ↗",
      source_url: "https://x.com",
      youtube_id: null,
      cooking_time: "20分",
      base_servings: 2,
      group_key: "pasta",
      group_name: "🍝 パスタ系",
      is_favorite: 1,
      my_arrangement: "ペコリーノチーズが手に入らない時はパルメザン粉チーズで代用可能。ベーコンはカリカリになるまでしっかり脂を出すのがコツ！",
      crosscheck: null,
      ingredients: JSON.stringify([
        { name: "パスタ", baseAmount: 160, unit: "g" },
        { name: "卵黄", baseAmount: 3, unit: "個分" },
        { name: "全卵", baseAmount: 1, unit: "個" },
        { name: "粉チーズ", baseAmount: 40, unit: "g" },
        { name: "厚切りベーコン", baseAmount: 80, unit: "g" },
        { name: "黒胡椒", baseAmount: 1, unit: "適量" }
      ]),
      steps: JSON.stringify([
        {
          num: 1,
          timeSec: 0,
          timeDisplay: "-",
          timerSeconds: 0,
          usedIngredients: [
            { name: "卵黄", amount: "3個分" },
            { name: "全卵", amount: "1個" },
            { name: "粉チーズ", amount: "40g" },
            { name: "黒胡椒", amount: "適量" }
          ],
          text: "ボウルに卵黄、全卵、粉チーズ、黒胡椒を入れてしっかり混ぜ合わせ、濃厚カルボナーラ液を作る。",
          technique: "【卵液の下処理】常温に戻しておくことで、パスタと和えた時に急激な温度低下を防ぎます。",
          stepImage: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600&q=80",
          tip: "チーズはたっぷりと惜しみなく使うのが本場の味に近づける秘訣です。"
        },
        {
          num: 2,
          timeSec: 0,
          timeDisplay: "-",
          timerSeconds: 180,
          usedIngredients: [{ name: "厚切りベーコン", amount: "80g" }],
          text: "フライパンでベーコンを弱火でじっくり炒め、脂をしっかり引き出す。カリカリになったら火を止める。",
          technique: "【ベーコンの火入れ】強火にせず弱中火で脂を溶かし出すように炒めることで旨味が凝縮します。",
          stepImage: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=600&q=80",
          tip: "出た脂は捨てずにパスタソースのベースとして使います。"
        }
      ]),
      raw_content: "Xポスト解析データ"
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO recipes (id, title, cover_image, source_type, source_badge, source_name, source_url,
      youtube_id, cooking_time, base_servings, group_key, group_name, is_favorite,
      my_arrangement, crosscheck, ingredients, steps, raw_content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of sampleRecipes) {
    stmt.run(
      r.id, r.title, r.cover_image, r.source_type, r.source_badge, r.source_name, r.source_url,
      r.youtube_id, r.cooking_time, r.base_servings, r.group_key, r.group_name, r.is_favorite,
      r.my_arrangement, r.crosscheck, r.ingredients, r.steps, r.raw_content
    );
  }
}

// ===== レシピ CRUD =====

export function getAllRecipes(filters = {}) {
  let query = 'SELECT * FROM recipes WHERE 1=1';
  const params = [];

  if (filters.group && filters.group !== 'all') {
    query += ' AND group_key = ?';
    params.push(filters.group);
  }
  if (filters.favorite) {
    query += ' AND is_favorite = 1';
  }
  if (filters.search) {
    query += ' AND (title LIKE ? OR ingredients LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term);
  }

  query += ' ORDER BY updated_at DESC';

  const rows = db.prepare(query).all(...params);
  return rows.map(parseRecipeRow);
}

export function getRecipeById(id) {
  const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
  return row ? parseRecipeRow(row) : null;
}

export function createRecipe(recipe) {
  const stmt = db.prepare(`
    INSERT INTO recipes (id, title, cover_image, source_type, source_badge, source_name, source_url,
      youtube_id, cooking_time, base_servings, group_key, group_name, is_favorite,
      my_arrangement, crosscheck, ingredients, steps, raw_content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    recipe.id,
    recipe.title,
    recipe.coverImage || null,
    recipe.sourceType || 'ai',
    recipe.sourceBadge || null,
    recipe.sourceName || null,
    recipe.sourceUrl || null,
    recipe.youtubeId || null,
    recipe.cookingTime || null,
    recipe.baseServings || 2,
    recipe.groupKey || 'other',
    recipe.groupName || '📁 その他',
    recipe.isFavorite ? 1 : 0,
    recipe.myArrangement || null,
    recipe.crosscheck || null,
    JSON.stringify(recipe.ingredients || []),
    JSON.stringify(recipe.steps || []),
    recipe.rawContent || null
  );

  return getRecipeById(recipe.id);
}

export function updateRecipe(id, updates) {
  const fields = [];
  const values = [];

  const fieldMap = {
    title: 'title',
    coverImage: 'cover_image',
    sourceType: 'source_type',
    sourceBadge: 'source_badge',
    sourceName: 'source_name',
    sourceUrl: 'source_url',
    youtubeId: 'youtube_id',
    cookingTime: 'cooking_time',
    baseServings: 'base_servings',
    groupKey: 'group_key',
    groupName: 'group_name',
    isFavorite: 'is_favorite',
    myArrangement: 'my_arrangement',
    crosscheck: 'crosscheck',
    ingredients: 'ingredients',
    steps: 'steps',
  };

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (updates[jsKey] !== undefined) {
      fields.push(`${dbCol} = ?`);
      let val = updates[jsKey];
      if (jsKey === 'ingredients' || jsKey === 'steps') {
        val = JSON.stringify(val);
      }
      if (jsKey === 'isFavorite') {
        val = val ? 1 : 0;
      }
      values.push(val);
    }
  }

  if (fields.length === 0) return getRecipeById(id);

  fields.push("updated_at = datetime('now','localtime')");
  values.push(id);

  db.prepare(`UPDATE recipes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getRecipeById(id);
}

export function deleteRecipe(id) {
  return db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
}

export function toggleFavorite(id) {
  db.prepare('UPDATE recipes SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(id);
  return getRecipeById(id);
}

// ===== グループ =====

export function getAllGroups() {
  return db.prepare('SELECT * FROM groups ORDER BY sort_order ASC').all();
}

// ===== 設定 =====

export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

export function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getAllSettings() {
  const rows = db.prepare('SELECT * FROM settings').all();
  const result = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

// ===== ヘルパー =====

function parseRecipeRow(row) {
  return {
    id: row.id,
    title: row.title,
    coverImage: row.cover_image,
    sourceType: row.source_type,
    sourceBadge: row.source_badge,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    youtubeId: row.youtube_id,
    cookingTime: row.cooking_time,
    baseServings: row.base_servings,
    groupKey: row.group_key,
    groupName: row.group_name,
    isFavorite: !!row.is_favorite,
    myArrangement: row.my_arrangement,
    crosscheck: row.crosscheck,
    ingredients: JSON.parse(row.ingredients || '[]'),
    steps: JSON.parse(row.steps || '[]'),
    rawContent: row.raw_content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default db;
