/**
 * YouTube関連のユーティリティ関数
 */

/**
 * YouTube URLから動画ID（11文字）を抽出
 * 通常URL, 短縮URL (youtu.be), Shorts, 埋め込みURL等に対応
 */
export function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.trim().match(regExp);
  return match ? match[1] : null;
}

// 概要欄取得用のCORS対応エンドポイント候補
const INVIDIOUS_ENDPOINTS = [
  'https://inv.tux.pizza',
  'https://vid.puffyan.us',
  'https://yewtu.be',
  'https://invidious.private.coffee',
  'https://iv.melmac.space',
];

/**
 * YouTube動画のメタデータ（タイトル、投稿者、サムネイル、概要欄テキスト）を取得
 * 公式oEmbed、Invidious API、CORSプロキシを多重フォールバックで活用
 */
export async function fetchYouTubeInfo(urlOrId) {
  if (!urlOrId) return { youtubeId: null, title: '', author: '', thumbnail: '', description: '' };
  
  const youtubeId = urlOrId.length === 11 ? urlOrId : extractYouTubeId(urlOrId);
  if (!youtubeId) {
    return { youtubeId: null, title: '', author: '', thumbnail: '', description: '' };
  }

  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  const thumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  let title = '';
  let author = '';
  let description = '';

  // 1. YouTube 公式 oEmbed エンドポイント（高速・CORS許可）
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`);
    if (res.ok) {
      const data = await res.json();
      title = data.title || '';
      author = data.author_name || '';
    }
  } catch (err) {
    console.warn('YouTube direct oEmbed fetch failed, trying noembed fallback:', err);
  }

  // 2. noembed.com フォールバック（タイトル取得用）
  if (!title) {
    try {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`);
      if (res.ok) {
        const data = await res.json();
        title = data.title || '';
        author = data.author_name || '';
      }
    } catch (err) {
      console.warn('noembed fallback fetch failed:', err);
    }
  }

  // 3. 動画概要欄（材料・分量テキスト）の取得（Invidious API & プロキシ）
  const descPromises = [
    // Lemnoslife noKey API
    (async () => {
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 3500);
        const r = await fetch(`https://yt.lemnoslife.com/noKey/videos?id=${youtubeId}&part=snippet`, { signal: c.signal });
        clearTimeout(t);
        if (r.ok) {
          const d = await r.json();
          const desc = d.items?.[0]?.snippet?.description;
          if (desc && desc.length > 10) return desc;
        }
      } catch (e) {}
      return null;
    })(),
    // Invidious 各インスタンス
    ...INVIDIOUS_ENDPOINTS.map(async (endpoint) => {
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 3500);
        const r = await fetch(`${endpoint}/api/v1/videos/${youtubeId}`, { signal: c.signal });
        clearTimeout(t);
        if (r.ok) {
          const d = await r.json();
          if (d.description && d.description.length > 10) return d.description;
        }
      } catch (e) {}
      return null;
    }),
  ];

  try {
    // 最初に応答のあった有効な概要欄を採用
    const firstValidDesc = await Promise.any(
      descPromises.map(p => p.then(v => v ? v : Promise.reject()))
    );
    if (firstValidDesc) {
      description = firstValidDesc;
    }
  } catch (err) {
    // 概要欄の自動取得が失敗した場合は空文字（手動貼付またはタイトルのみでフォールバック）
    console.warn('Could not auto-fetch video description from APIs:', err);
  }

  return { youtubeId, title, author, thumbnail, description };
}

/**
 * 動画タイトルの装飾（【大人気】や【簡単レシピ】など）を取り除いて綺麗な料理名にする
 */
export function cleanRecipeTitle(rawTitle) {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/【[^】]+】/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/（[^）]+）/g, '')
    .replace(/\([^)]+\)/g, '')
    .replace(/★|☆|！|!|🔥|🍳|🍚|✨/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
