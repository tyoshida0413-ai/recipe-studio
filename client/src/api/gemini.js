/**
 * Google Gemini API 直接連携クライアント
 * Google AI Studio で取得した Gemini API キー（AIzaSy...）を用いて、
 * ブラウザから直接最新モデル（Gemini 3.8 Flash 等）で高速・高精度なレシピ構造化解析を実行します。
 */

const RECIPE_PROMPT_SYSTEM = `
あなたはプロの料理研究家兼レシピ解析AIです。
入力された情報（YouTube概要欄テキスト、調理動画の字幕・説明、メモなど）から料理レシピを正確に構造化し、必ず指定されたJSONフォーマットのみを出力してください。
特定の料理（角煮やパスタ等）に対する先入観は一切捨て、入力されたテキストのみに厳格に従ってください。

【最重要遵守事項：ハルシネーション（勝手な創作・推測・具材捏造・工程追加）の完全厳禁】
1. 食材・調味料の100%忠実な抽出（勝手な追加・変更の完全禁止）:
   - 入力テキストや概要欄に記載された食材・調味料・部位のみを抽出してください。
   - 入力に記載されていない具材（水、油、調味料、長ネギ、生姜、ニンニク、ハーブ、薬味など）は、どんなに料理として一般的・常識的であっても【絶対に1つも追加してはなりません】。
   - 食材の部位・形状を勝手に変更することは厳禁です（例: 豚バラスライス肉・薄切り肉を勝手にブロック肉に変えたり、鶏むねを鶏ももに変えるなど）。記載通りの食材名・部位を出力してください。

2. 切る工程・下処理工程の勝手な捏造・追加の絶対禁止:
   - 入力テキストで明示的に「切る」「カットする」「一口大にする」「刻む」と指示されていない食材について、勝手に切断工程や下処理工程をでっち上げて手順（steps）に追加してはなりません。
   - スライス肉やひき肉、カット済み食材、切らずにそのままフライパンや鍋・レンジに入れて調理するレシピが多数存在します。入力に指示がないカット工程・下準備は絶対に含めないでください。

3. 分量表記の忠実性:
   - 概要欄や入力テキストに記載されている分量（例: 200g、大さじ1、少々など）を一字一句そのまま出力してください。
   - 記載のない分量は勝手に数値を捏造せず「適量」または「お好みで」としてください。一般的な黄金比などに勝手に書き換えてはいけません。

4. 手順（steps）とタイムスタンプ:
   - 手順は入力テキストに実際に書かれている調理アクションのみを順序立てて構成してください。
   - 各調理ステップには、動画内の該当シーンの開始秒数（timeSec: 数値）と、分秒表記（timeDisplay: "01:25"形式）を必ず設定してください。

【出力必須JSONスキーマ】
{
  "title": "料理名（余計な装飾記号【】等を除いた名称）",
  "cookingTime": "所要時間（例: 15分）",
  "baseServings": 1,
  "groupKey": "pasta または nabe または rice または other",
  "groupName": "グループ表示名（例: 🍝 パスタ系、🍚 ご飯・肉系、🍲 鍋・汁物系、🥗 その他）",
  "coverImage": "料理のイメージ写真URL",
  "myArrangement": "料理のポイントやアレンジのコツ",
  "crosscheck": {
    "hasDiff": false,
    "title": "AI照合完了",
    "desc": "概要欄・動画情報と材料・手順の整合性を確認しました。"
  },
  "ingredients": [
    {
      "name": "食材・調味料名",
      "amount": "分量表記（例: 150g, 大さじ1, 適量）",
      "baseAmount": 150,
      "unit": "単位（例: g, 大さじ, 個）"
    }
  ],
  "steps": [
    {
      "num": 1,
      "text": "具体的な手順説明（入力にないカット等の工程は勝手に入れない）",
      "timeSec": 0,
      "timeDisplay": "00:00",
      "technique": "言及されている場合のみ切り方やコツ",
      "tip": "失敗しないための注意点",
      "timerSeconds": 0,
      "usedIngredients": [
        { "name": "この工程で使う食材名", "amount": "分量" }
      ]
    }
  ]
}
`;

export async function analyzeWithGemini(apiKey, inputText, options = {}) {
  if (!apiKey) {
    throw new Error('Gemini API キーが設定されていません。「⚙️ API設定」から登録してください。');
  }

  // 最新モデル（デフォルト: gemini-3.8-flash）
  const model = options.model || 'gemini-3.8-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

  const userPrompt = `
以下の料理情報からレシピを作成・解析してください：
---
${inputText}
---
必ず指定されたJSONフォーマットのみを返してください。Markdownのコードブロック（\`\`\`json）で囲んで構いません。
`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: RECIPE_PROMPT_SYSTEM },
          { text: userPrompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error?.message || `Gemini API エラー: ステータス ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Geminiからの応答を取得できませんでした。');
  }

  // JSONパース
  try {
    const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
    const recipe = JSON.parse(cleaned);
    recipe.id = `rec_${Date.now()}`;
    recipe.sourceType = options.sourceType || 'ai';
    recipe.sourceBadge = options.sourceBadge || `🤖 Gemini (${model})`;
    recipe.isFavorite = false;

    // 各工程のタイムスタンプ補完（欠落防止）
    if (recipe.steps && Array.isArray(recipe.steps)) {
      recipe.steps.forEach((step, sIdx) => {
        if (step.timeSec === undefined || step.timeSec === null) {
          step.timeSec = sIdx * 35;
        }
        if (!step.timeDisplay) {
          const m = Math.floor(step.timeSec / 60);
          const s = step.timeSec % 60;
          step.timeDisplay = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
      });
    }
    return recipe;
  } catch (parseErr) {
    console.error('Gemini output parse error:', rawText);
    throw new Error('Geminiの出力結果をレシピ形式に変換できませんでした。');
  }
}

/**
 * Gemini API 接続テスト
 */
export async function testGeminiConnection(apiKey, model = 'gemini-3.8-flash') {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API キーが未入力です');
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model.trim()}:generateContent?key=${apiKey.trim()}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hello, respond with OK only.' }] }],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTPエラー ${res.status}`);
  }
  return true;
}

