import { useState, useEffect, useCallback } from 'react';
import { recipesApi } from '../api/client.js';
import { supabaseSync } from '../api/supabaseSync.js';

const LOCAL_RECIPES_KEY = 'recipe_ai_recipes';
const SETTINGS_KEY = 'recipe_ai_settings';

// 初期サンプルレシピ（初回表示用）
const DEFAULT_RECIPES = [
  {
    id: "rec_yt_01",
    title: "至高のペペロンチーノ",
    coverImage: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80",
    sourceType: "yt",
    sourceBadge: "▶ YouTube動画",
    sourceName: "料理研究家リュウジのバズレシピ ↗",
    sourceUrl: "https://www.youtube.com/watch?v=F5kZ9mC8q1g",
    youtubeId: "F5kZ9mC8q1g",
    cookingTime: "15分",
    baseServings: 1,
    groupKey: "pasta",
    groupName: "🍝 パスタ系",
    isFavorite: true,
    myArrangement: "初回調理時：少し塩気が強かったので、パスタを茹でるお湯の塩分を少し控えめにするとちょうど良い。ニンニクは包丁の腹で潰してからみじん切りにすると香りが格段にアップする！",
    crosscheck: {
      hasDiff: true,
      title: "AI相互照合完了",
      desc: "概要欄（塩 小さじ1）と動画内発言（02:15 塩 小さじ1/2）の差異を検知し、水分蒸発を考慮した動画発言を優先採用しました。"
    },
    ingredients: [
      { name: "パスタ (1.4〜1.6mm)", baseAmount: 100, unit: "g" },
      { name: "にんにく", baseAmount: 2, unit: "片" },
      { name: "オリーブオイル", baseAmount: 2, unit: "大さじ" },
      { name: "赤唐辛子（輪切り）", baseAmount: 1, unit: "本分" },
      { name: "塩（茹で用・味付け）", baseAmount: 0.5, unit: "小さじ" },
      { name: "水", baseAmount: 350, unit: "ml" },
      { name: "味の素", baseAmount: 4, unit: "振り" }
    ],
    steps: [
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
    ]
  },
  {
    id: "rec_x_02",
    title: "本場ローマ風 濃厚カルボナーラ",
    coverImage: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80",
    sourceType: "x",
    sourceBadge: "𝕏 ポスト解析",
    sourceName: "イタリア料理人Xアカウント ↗",
    sourceUrl: "https://x.com",
    youtubeId: null,
    cookingTime: "20分",
    baseServings: 2,
    groupKey: "pasta",
    groupName: "🍝 パスタ系",
    isFavorite: true,
    myArrangement: "ペコリーノチーズが手に入らない時はパルメザン粉チーズで代用可能。ベーコンはカリカリになるまでしっかり脂を出すのがコツ！",
    crosscheck: null,
    ingredients: [
      { name: "パスタ", baseAmount: 160, unit: "g" },
      { name: "卵黄", baseAmount: 3, unit: "個分" },
      { name: "全卵", baseAmount: 1, unit: "個" },
      { name: "粉チーズ", baseAmount: 40, unit: "g" },
      { name: "厚切りベーコン", baseAmount: 80, unit: "g" },
      { name: "黒胡椒", baseAmount: 1, unit: "適量" }
    ],
    steps: [
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
    ]
  }
];

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ group: 'all', favorite: false, search: '' });

  // 設定ヘルパー
  const getStoredSettings = () => {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch {
      return {};
    }
  };

  // レシピ一覧取得（Supabase同期 優先 ＞ サーバーAPI ＞ LocalStorage）
  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = getStoredSettings();
      const { supabase_url, supabase_anon_key, sync_key } = settings;

      // 1. Supabase 同期キーが設定されている場合
      if (supabase_url && supabase_anon_key && sync_key) {
        try {
          const cloudData = await supabaseSync.fetchRecipes(supabase_url, supabase_anon_key, sync_key);
          if (cloudData && cloudData.length > 0) {
            setRecipes(cloudData);
            localStorage.setItem(LOCAL_RECIPES_KEY, JSON.stringify(cloudData));
            return;
          } else if (cloudData && cloudData.length === 0) {
            // クラウドが空の場合はローカルキャッシュまたはデフォルトをシード保存
            const local = JSON.parse(localStorage.getItem(LOCAL_RECIPES_KEY) || 'null') || DEFAULT_RECIPES;
            for (const r of local) {
              await supabaseSync.saveRecipe(supabase_url, supabase_anon_key, sync_key, r).catch(() => {});
            }
            setRecipes(local);
            localStorage.setItem(LOCAL_RECIPES_KEY, JSON.stringify(local));
            return;
          }
        } catch (syncErr) {
          console.warn('Supabase fetch failed, falling back to local:', syncErr);
        }
      }

      // 2. サーバーAPIがある場合
      try {
        const data = await recipesApi.getAll(filters);
        if (data && data.length > 0) {
          setRecipes(data);
          localStorage.setItem(LOCAL_RECIPES_KEY, JSON.stringify(data));
          return;
        }
      } catch (serverErr) {
        // サーバーなし（GitHub Pages静的配信）
      }

      // 3. LocalStorage キャッシュ
      const local = JSON.parse(localStorage.getItem(LOCAL_RECIPES_KEY) || 'null');
      if (local && local.length > 0) {
        setRecipes(local);
      } else {
        setRecipes(DEFAULT_RECIPES);
        localStorage.setItem(LOCAL_RECIPES_KEY, JSON.stringify(DEFAULT_RECIPES));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // グループ一覧の動的生成
  const groups = [
    { key: 'pasta', name: '🍝 パスタ系' },
    { key: 'nabe', name: '🍲 鍋・汁物系' },
    { key: 'rice', name: '🍚 ご飯・肉系' },
  ];

  // レシピ選択
  const selectRecipe = useCallback((recipe) => {
    setCurrentRecipe(recipe);
  }, []);

  // レシピ更新
  const updateRecipe = useCallback(async (id, updates) => {
    try {
      const updatedList = recipes.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r));
      setRecipes(updatedList);
      localStorage.setItem(LOCAL_RECIPES_KEY, JSON.stringify(updatedList));

      const target = updatedList.find((r) => r.id === id);
      if (currentRecipe?.id === id) {
        setCurrentRecipe(target);
      }

      // Supabase同期
      const settings = getStoredSettings();
      if (settings.supabase_url && settings.supabase_anon_key && settings.sync_key && target) {
        supabaseSync.saveRecipe(settings.supabase_url, settings.supabase_anon_key, settings.sync_key, target).catch(console.error);
      }

      // サーバーAPI更新
      recipesApi.update(id, updates).catch(() => {});

      return target;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [recipes, currentRecipe]);

  // お気に入りトグル
  const toggleFavorite = useCallback(async (id) => {
    const target = recipes.find((r) => r.id === id);
    if (!target) return;
    await updateRecipe(id, { isFavorite: !target.isFavorite });
  }, [recipes, updateRecipe]);

  // レシピ削除
  const removeRecipe = useCallback(async (id) => {
    try {
      const filtered = recipes.filter((r) => r.id !== id);
      setRecipes(filtered);
      localStorage.setItem(LOCAL_RECIPES_KEY, JSON.stringify(filtered));

      if (currentRecipe?.id === id) {
        setCurrentRecipe(filtered[0] || null);
      }

      // Supabase同期削除
      const settings = getStoredSettings();
      if (settings.supabase_url && settings.supabase_anon_key && settings.sync_key) {
        supabaseSync.deleteRecipe(settings.supabase_url, settings.supabase_anon_key, settings.sync_key, id).catch(console.error);
      }

      // サーバーAPI削除
      recipesApi.delete(id).catch(() => {});
    } catch (err) {
      setError(err.message);
    }
  }, [recipes, currentRecipe]);

  // レシピ追加
  const addRecipe = useCallback((newRecipe) => {
    const recipeWithId = {
      ...newRecipe,
      id: newRecipe.id || `rec_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };

    setRecipes((prev) => {
      const updated = [recipeWithId, ...prev];
      localStorage.setItem(LOCAL_RECIPES_KEY, JSON.stringify(updated));
      return updated;
    });

    setCurrentRecipe(recipeWithId);

    // Supabase同期保存
    const settings = getStoredSettings();
    if (settings.supabase_url && settings.supabase_anon_key && settings.sync_key) {
      supabaseSync.saveRecipe(settings.supabase_url, settings.supabase_anon_key, settings.sync_key, recipeWithId).catch(console.error);
    }

    // サーバーAPI追加
    recipesApi.create(recipeWithId).catch(() => {});
  }, []);

  // フィルタリング処理（画面表示用）
  const filteredRecipes = recipes.filter((recipe) => {
    if (filters.favorite && !recipe.isFavorite) return false;
    if (filters.group && filters.group !== 'all' && recipe.groupKey !== filters.group) return false;
    if (filters.search) {
      const term = filters.search.toLowerCase();
      const matchTitle = (recipe.title || '').toLowerCase().includes(term);
      const matchIng = (recipe.ingredients || []).some((ing) => (ing.name || '').toLowerCase().includes(term));
      if (!matchTitle && !matchIng) return false;
    }
    return true;
  });

  return {
    recipes: filteredRecipes,
    rawRecipes: recipes,
    groups,
    currentRecipe,
    loading,
    error,
    filters,
    setFilters,
    selectRecipe,
    updateRecipe,
    toggleFavorite,
    removeRecipe,
    addRecipe,
    fetchRecipes,
  };
}
