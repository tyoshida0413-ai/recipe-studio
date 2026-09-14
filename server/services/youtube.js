import { YoutubeTranscript } from 'youtube-transcript';

/**
 * YouTube動画のIDをURLから抽出
 */
export function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * YouTube動画のメタデータをoEmbed APIで取得
 */
export async function getVideoMetadata(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) throw new Error(`oEmbed failed: ${res.status}`);
    const data = await res.json();
    return {
      title: data.title,
      authorName: data.author_name,
      authorUrl: data.author_url,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch (err) {
    console.error('YouTube metadata fetch error:', err.message);
    return {
      title: `YouTube動画 (${videoId})`,
      authorName: '不明',
      authorUrl: '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

/**
 * YouTube動画の字幕を取得
 * @returns {Promise<{text: string, segments: Array<{text: string, offset: number, duration: number}>}>}
 */
export async function getTranscript(videoId) {
  try {
    // 日本語字幕を優先、なければ英語、なければ自動生成
    const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ja' })
      .catch(() => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' }))
      .catch(() => YoutubeTranscript.fetchTranscript(videoId));

    const fullText = segments.map(s => s.text).join(' ');

    return {
      text: fullText,
      segments: segments.map(s => ({
        text: s.text,
        offset: Math.round(s.offset / 1000),  // ms → sec
        duration: Math.round(s.duration / 1000),
      })),
    };
  } catch (err) {
    console.error('Transcript fetch error:', err.message);
    throw new Error(`字幕の取得に失敗しました: ${err.message}。この動画には字幕が存在しないか、取得が制限されている可能性があります。`);
  }
}

/**
 * YouTube動画の全情報を一括取得
 */
export async function fetchYouTubeData(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('有効なYouTube URLを入力してください。');
  }

  const [metadata, transcript] = await Promise.all([
    getVideoMetadata(videoId),
    getTranscript(videoId),
  ]);

  return {
    videoId,
    metadata,
    transcript,
  };
}
