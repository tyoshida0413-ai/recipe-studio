import OpenAI from 'openai';
import { getSetting } from '../db/database.js';

/**
 * OpenAIクライアントを設定から動的に生成
 */
function getClient() {
  const apiKey = getSetting('openai_api_key');
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。設定画面からAPIキーを登録してください。');
  }
  return new OpenAI({ apiKey });
}

/**
 * レシピ構造化抽出のシステムプロンプト
 */
const RECIPE_EXTRACTION_PROMPT = `あなたはプロの料理研究家兼データエンジニアです。
入力されたテキスト（YouTube動画の字幕、メモ、レシピテキスト等）から、料理レシピを正確に構造化JSONとして抽出してください。

以下のJSONスキーマに厳密に従って出力してください:

{
  "title": "料理名（正式名称）",
  "cookingTime": "調理時間の目安（例: 15分）",
  "baseServings": 人数(数値),
  "groupKey": "分類キー（pasta/nabe/rice/meat/side/other のいずれか）",
  "groupName": "分類表示名（例: 🍝 パスタ系）",
  "myArrangement": null,
  "crosscheck": "概要欄と動画発言で分量や手順に食い違いがある場合、その差異を記述。なければnull",
  "ingredients": [
    { "name": "食材名", "baseAmount": 数量(数値), "unit": "単位" }
  ],
  "steps": [
    {
      "num": ステップ番号(数値),
      "timeSec": 動画内の該当秒数(数値、不明なら0),
      "timeDisplay": "タイムスタンプ表示（例: 01:23）",
      "timerSeconds": この工程のタイマー秒数(数値、不要なら0),
      "usedIngredients": [
        { "name": "食材名", "amount": "分量（表示用文字列）" }
      ],
      "text": "手順の説明テキスト（初心者にもわかるよう具体的に）",
      "technique": "切り方・下処理のコツ（プロの技術的アドバイス）",
      "stepImage": null,
      "tip": "ワンポイントアドバイスや補足（あれば）"
    }
  ]
}

重要な注意:
1. 材料の分量は正確に抽出してください。概要欄と発言に食い違いがある場合は、動画内の発言を優先し、crosscheckフィールドに差異を記録してください。
2. 手順は調理の流れに沿って時系列順に、初心者でもわかるよう具体的に記述してください。
3. 切り方や下処理のテクニック（みじん切り、千切りなど）は technique フィールドに詳しく記載してください。
4. groupKeyは料理の種類に応じて適切に分類してください:
   - pasta: パスタ、麺類
   - nabe: 鍋、スープ、汁物
   - rice: ご飯もの、丼
   - meat: 肉料理メイン
   - side: 副菜、サラダ、作り置き
   - other: その他
5. JSONのみを出力し、他の説明テキストは含めないでください。`;

/**
 * YouTube動画の字幕からレシピを抽出
 */
export async function analyzeYouTubeTranscript(transcriptText, metadata) {
  const client = getClient();

  const userMessage = `以下はYouTube料理動画「${metadata.title}」（チャンネル: ${metadata.authorName}）の字幕テキストです。
この内容からレシピを構造化JSONとして抽出してください。

--- 字幕テキスト ---
${transcriptText}
---`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: RECIPE_EXTRACTION_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content);
}

/**
 * テキスト/メモからレシピを抽出
 */
export async function analyzeText(text, imageUrl = null) {
  const client = getClient();

  const messages = [
    { role: 'system', content: RECIPE_EXTRACTION_PROMPT },
  ];

  if (imageUrl) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: `以下のテキストと画像からレシピを構造化JSONとして抽出してください。\n\n${text}` },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: `以下のテキストからレシピを構造化JSONとして抽出してください。\n\n${text}`,
    });
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content);
}

/**
 * AIによるゼロベースレシピ生成
 */
export async function generateRecipe(prompt) {
  const client = getClient();

  const systemPrompt = `あなたはミシュラン三ツ星レストランで修行経験のあるプロの料理研究家です。
ユーザーの要望に基づいて、家庭で再現可能なオリジナルレシピを考案してください。
プロの技やコツを惜しみなく盛り込み、初心者でも失敗しないよう丁寧に手順を記述してください。

${RECIPE_EXTRACTION_PROMPT}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `以下の要望に合うオリジナルレシピを考案し、構造化JSONとして出力してください:\n\n${prompt}` },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content);
}
