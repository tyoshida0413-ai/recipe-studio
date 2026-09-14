/**
 * Google Gemini API 直接連携クライアント
 * Google AI Studio で取得した Gemini API キー（AIzaSy...）を用いて、
 * ブラウザから直接最新モデル（Gemini 3.8 Flash 等）で高速・高精度なレシピ構造化解析を実行します。
 */

const RECIPE_PROMPT_SYSTEM = `
あなたはプロの料理研究家兼レシピ解析AIです。
入力された情報（YouTube概要欄テキスト、メモ、動画情報など）から、料理レシピを正確に構造化し、必ず指定されたJSONフォーマットのみを出力してください。

【最重要遵守事項：ハルシネーション（勝手な創作・推測・具材捏造）の完全厳禁】
1. 食材・部位・切り方の忠実性:
   - 入力テキストや動画概要欄に記載された食材・調味料のみを抽出してください。
   - 【厳禁例】料理名に「角煮風」とあっても、入力情報や動画で「豚バラスライス」「豚バラ薄切り肉」が使われている場合、勝手に「豚バラブロック肉」に置き換えることは絶対禁止です！必ず指定されている薄切り肉/スライス肉のまま出力してください。
   - 勝手に「長ネギの青い部分」「生姜の薄切り」「八角」「ゆで卵」などの動画で使われていない余計な具材や香味野菜を創作・追加してはいけません。
2. 分量の正確性:
   - 概要欄や入力テキストに記載されている調味料の分量（例: 醤油大さじ2、みりん大さじ1など）を勝手に書き換えたり、一般的な比率に改変せず、記載通りの分量をそのまま出力してください。
3. 調理手順の忠実性:
   - 動画や概要欄の実際の手順に沿って構成してください。ブロック肉の下茹でや脂抜きなど、元の料理で実際に行っていない無関係な工程を勝手に捏造しないでください。

【出力必須JSONスキーマ】
{
  "title": "料理名",
  "cookingTime": "所要時間（例: 15分）",
  "baseServings": 1（数値）,
  "groupKey": "pasta または nabe または rice または other",
  "groupName": "グループ表示名（例: 🍝 パスタ系）",
  "coverImage": "料理のイメージ写真URL（Unsplashの料理写真等）",
  "myArrangement": "プロからのワンポイントアドバイスやアレンジ提案",
  "crosscheck": {
    "hasDiff": false,
    "title": "AI照合完了",
    "desc": "材料・手順の整合性を確認しました。"
  },
  "ingredients": [
    {
      "name": "食材・調味料名",
      "amount": "分量表記（例: 100g, 2片, 大さじ1）",
      "baseAmount": 100（数値、不明ならnull）,
      "unit": "単位（例: g, 片, 大さじ）"
    }
  ],
  "steps": [
    {
      "num": 1,
      "text": "具体的な手順説明",
      "technique": "切り方や下処理のプロのコツ（あれば）",
      "tip": "失敗しないための注意点やポイント",
      "timerSeconds": 120（タイマーが必要な工程なら秒数、不要なら0）,
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

