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

/**
 * YouTube動画のメタデータ（タイトル、投稿者、サムネイル）を取得
 * ブラウザからCORS制限なく取得できるYouTube公式oEmbedおよびnoembed.comを活用
 */
export async function fetchYouTubeInfo(urlOrId) {
  if (!urlOrId) return { youtubeId: null, title: '', author: '', thumbnail: '' };
  
  const youtubeId = urlOrId.length === 11 ? urlOrId : extractYouTubeId(urlOrId);
  if (!youtubeId) {
    return { youtubeId: null, title: '', author: '', thumbnail: '' };
  }

  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  const thumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  let title = '';
  let author = '';

  // 1. YouTube 公式 oEmbed エンドポイント（CORS許可）
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

  // 2. noembed.com フォールバック（公式が失敗した場合）
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

  return { youtubeId, title, author, thumbnail };
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
