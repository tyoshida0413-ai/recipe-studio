/**
 * Google Gemini API 直接連携クライアント
 * Google AI Studio で取得した Gemini API キー（AIzaSy...）を用いて、
 * ブラウザから直接最新モデル（Gemini 3.8 Flash 等）で高速・高精度なレシピ構造化解析を実行します。
 */

const RECIPE_PROMPT_SYSTEM = `
あなたは世界最高峰のレシピ解析AIです。
動画の映像・音声、および入力テキストから、料理レシピを寸分の狂いもなく正確に構造化し、必ず指定されたJSONフォーマットのみを出力してください。
推測や一般的な知識による補完（ハルシネーション）は一切禁止です。

【絶対厳守ルール：ハルシネーション（勝手な創作・捏造・工程追加）の完全根絶】
1. 切る工程・カットの捏造は厳禁:
   - 動画やテキストで包丁を使って切っていない食材（豚バラスライス肉、薄切り肉、ひき肉、カット野菜など）について、勝手に手順（steps）で「切る」「カットする」「一口大に切る」「刻む」などの工程を入れてはなりません。
   - パックからそのまま入れる、切らずにそのまま炊飯器やフライパン・鍋に投入する料理が多数あります。動画・テキストにない「切る工程」は絶対に1文字たりとも書かないでください。

2. 材料・調味料の勝手な追加・変更の完全禁止:
   - 動画・テキストで明示されている食材・調味料のみを100%忠実に抽出してください。
   - 言及されていない具材（水、油、生姜、長ネギ、ニンニク、塩コショウ、薬味など）は、どんなに料理として一般的であっても【絶対に1つも追加してはなりません】。
   - スライス肉をブロック肉に変えたり、部位や肉の種類を勝手に変更することは厳禁です。

3. 分量の絶対正確性:
   - 動画内の発言や概要欄に記載された分量（大さじ、小さじ、グラム、個数など）をそのまま正確に出力してください。一般的な比率に勝手に書き換えてはいけません。

4. 手順（steps）とタイムスタンプ:
   - 動画内で行われている実際のアクションのみを時系列に沿って記載してください。動画にない無関係な下処理は含めないでください。
   - 各ステップには、該当シーンの開始秒数（timeSec）と分秒表記（timeDisplay、例: "00:35"）を設定してください。

5. マイアレンジ・味変・実食おすすめの積極的抽出:
   - 動画内の実食シーンやトーク、テロップで言及される味変（例:「からし（辛子）をつけると最高」「ラー油やマヨネーズ」「ブラックペッパー」等）や、動画ならではのワンポイント・おすすめの食べ方を、必ず myArrangement（マイアレンジ・料理メモ）や最終工程の tip に具体的に記録してください。

【出力必須JSONスキーマ】
{
  "title": "料理名（余計な装飾記号【】等を除いた名称）",
  "cookingTime": "所要時間（例: 15分）",
  "baseServings": 1,
  "groupKey": "pasta または nabe または rice または other",
  "groupName": "グループ表示名（例: 🍝 パスタ系、🍚 ご飯・肉系、🍲 鍋・汁物系、🥗 その他）",
  "coverImage": "料理の写真URL",
  "myArrangement": "動画の実食シーンで紹介される味変（からし、薬味等）やおすすめアレンジ・ワンポイントのコツ",
  "crosscheck": {
    "hasDiff": false,
    "title": "照合完了",
    "desc": "動画・テキストと整合性を確認しました。"
  },
  "ingredients": [
    {
      "name": "食材・調味料名",
      "amount": "分量表記（例: 150g, 大さじ1）",
      "baseAmount": 150,
      "unit": "単位"
    }
  ],
  "steps": [
    {
      "num": 1,
      "text": "具体的な手順説明（切ると言っていない食材は絶対に切る工程にしないこと）",
      "timeSec": 0,
      "timeDisplay": "00:00",
      "technique": "言及されている場合のみコツ",
      "tip": "注意点",
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

  const cleanKey = apiKey.trim();
  const preferredModel = (options.model || 'gemini-3.8-flash').trim();

  // 試行するモデル候補のチェーン
  const candidateModels = [
    preferredModel,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const userPrompt = `
以下の料理情報からレシピを作成・解析してください：
---
${inputText}
---
必ず指定されたJSONフォーマットのみを返してください。Markdownのコードブロック（\`\`\`json）で囲んで構いません。
`;

  let lastError = null;
  let rawText = '';
  let successfulModel = '';

  for (const currentModel of candidateModels) {
    try {
      // === 方式A: Google公式 最新 Interactions API（YouTube動画URL直接マルチモーダル解析） ===
      try {
        const iEndpoint = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${cleanKey}`;
        
        // YouTube URLがある場合、動画フレーム・音声・字幕をマルチモーダル直接解析！
        let interactionInput;
        if (options.youtubeUrl) {
          interactionInput = [
            { type: 'text', text: `${RECIPE_PROMPT_SYSTEM}\n\n${userPrompt}` },
            { type: 'video', uri: options.youtubeUrl.trim() },
          ];
        } else {
          interactionInput = `${RECIPE_PROMPT_SYSTEM}\n\n${userPrompt}`;
        }

        const iPayload = {
          model: currentModel,
          input: interactionInput,
          response_format: {
            type: 'text',
            mime_type: 'application/json',
          },
        };

        const iRes = await fetch(iEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': cleanKey,
          },
          body: JSON.stringify(iPayload),
        });

        if (iRes.ok) {
          const iData = await iRes.json();
          const t = iData.output_text ||
            (Array.isArray(iData.steps) ? iData.steps.find(s => s.type === 'text')?.text : null);
          if (t && t.trim()) {
            rawText = t.trim();
            successfulModel = currentModel;
            break;
          }
        } else {
          console.warn(`Interactions API failed with status ${iRes.status}`);
        }
      } catch (iErr) {
        console.warn('Interactions API call error:', iErr);
      }

      // === 方式B: 公式標準 generateContent API（JSON構造化出力モード） ===
      if (!rawText) {
        const gEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${cleanKey}`;
        const gPayload = {
          contents: [
            {
              parts: [
                { text: RECIPE_PROMPT_SYSTEM },
                { text: userPrompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1, // 創造性を抑えて忠実性を極限まで高める
            responseMimeType: 'application/json',
          },
        };

        const gRes = await fetch(gEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gPayload),
        });

        if (!gRes.ok) {
          const errJson = await gRes.json().catch(() => ({}));
          const errMsg = errJson.error?.message || `HTTP ${gRes.status}`;
          throw new Error(`[${currentModel}] ${errMsg}`);
        }

        const data = await gRes.json();
        const candidate = data.candidates?.[0];

        if (candidate) {
          const parts = candidate.content?.parts || [];
          const answerParts = parts.filter((p) => p.text && !p.thought);
          if (answerParts.length > 0) {
            rawText = answerParts.map((p) => p.text).join('\n').trim();
          } else {
            rawText = parts.map((p) => p.text || '').filter(Boolean).join('\n').trim();
          }
        }

        if (rawText) {
          successfulModel = currentModel;
          break;
        } else {
          const reason = candidate?.finishReason || data.promptFeedback?.blockReason || '応答が空でした';
          throw new Error(`[${currentModel}] レスポンス中断: ${reason}`);
        }
      }
    } catch (err) {
      console.warn(`Model ${currentModel} failed:`, err.message);
      lastError = err;
    }
  }

  if (!rawText) {
    const detailMsg = lastError?.message || '利用可能なGeminiモデルが見つかりませんでした。';
    throw new Error(`Gemini API エラー: ${detailMsg}。APIキーの有効性と残枠をご確認ください。`);
  }

  // JSONパース
  try {
    const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
    const recipe = JSON.parse(cleaned);
    recipe.id = `rec_${Date.now()}`;
    recipe.sourceType = options.sourceType || 'ai';
    recipe.sourceBadge = options.sourceBadge || `🤖 Gemini (${successfulModel})`;
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
  const cleanKey = apiKey.trim();
  const candidateModels = [
    (model || 'gemini-3.8-flash').trim(),
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastErr = null;
  for (const m of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${cleanKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with OK only.' }] }],
        }),
      });
      if (res.ok) {
        return { ok: true, activeModel: m };
      }
      const errorData = await res.json().catch(() => ({}));
      lastErr = new Error(`[${m}] ` + (errorData.error?.message || `HTTPエラー ${res.status}`));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Gemini API への接続テストに失敗しました。');
}

