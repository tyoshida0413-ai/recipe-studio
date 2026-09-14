import React, { useState, useEffect, useRef } from 'react';
import { analyzeApi } from '../api/client.js';
import { analyzeWithGemini } from '../api/gemini.js';
import { extractYouTubeId, fetchYouTubeInfo, cleanRecipeTitle } from '../utils/youtube.js';

export default function ImportModal({ isOpen, onClose, onRecipeCreated }) {
  const [activeTab, setActiveTab] = useState('yt'); // yt, x, memo, ai
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ytDescription, setYtDescription] = useState('');
  const [videoMeta, setVideoMeta] = useState(null);
  const [fetchingVideo, setFetchingVideo] = useState(false);

  const [xPostText, setXPostText] = useState('');
  const [memoText, setMemoText] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  const [loading, setLoading] = useState(false);
  const [currentStepText, setCurrentStepText] = useState('');
  const [error, setError] = useState(null);

  const debounceTimerRef = useRef(null);

  // YouTubeのURL変更時に動画情報を自動取得
  const handleYoutubeUrlChange = (val) => {
    setYoutubeUrl(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const ytId = extractYouTubeId(val);
    if (!ytId) {
      setVideoMeta(null);
      return;
    }

    setFetchingVideo(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const info = await fetchYouTubeInfo(val);
        if (info && info.title) {
          setVideoMeta(info);
          // 概要欄が自動取得できた場合、自動でセット
          if (info.description && !ytDescription.trim()) {
            setYtDescription(info.description);
          }
        } else {
          setVideoMeta({ youtubeId: ytId, title: '', author: '', thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, description: '' });
        }
      } catch (err) {
        console.warn('YouTube info fetch error:', err);
      } finally {
        setFetchingVideo(false);
      }
    }, 400);
  };

  if (!isOpen) return null;

  const getSettings = () => {
    try {
      return JSON.parse(localStorage.getItem('recipe_ai_settings') || '{}');
    } catch {
      return {};
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);

    const settings = getSettings();
    const geminiKey = settings.gemini_api_key;
    const openaiKey = settings.openai_api_key;

    if (!geminiKey && !openaiKey) {
      setError('AIのAPIキーが設定されていません。右上の「⚙️ API設定」から Gemini または OpenAI のキーを登録してください。');
      setLoading(false);
      return;
    }

    try {
      let created = null;

      // === 1. Gemini 直接解析（推奨・GitHub Pagesでも100%動作） ===
      if (geminiKey) {
        if (activeTab === 'yt') {
          if (!youtubeUrl.trim()) throw new Error('YouTubeのURLを入力してください');
          
          setCurrentStepText('YouTube動画のタイトルと詳細情報を取得中...');
          let info = videoMeta;
          const ytId = extractYouTubeId(youtubeUrl.trim());
          if (!info || !info.title) {
            info = await fetchYouTubeInfo(youtubeUrl.trim());
            setVideoMeta(info);
            if (info?.description && !ytDescription.trim()) {
              setYtDescription(info.description);
            }
          }

          const videoTitle = info?.title || '';
          const authorName = info?.author || '';
          const effectiveDesc = ytDescription.trim() || info?.description || '';

          setCurrentStepText(videoTitle ? `「${videoTitle}」からレシピをAI構造化中...` : 'Gemini AIが動画情報からレシピを構造化中...');

          // 厳格なプロンプトを作成（ハルシネーション・勝手な具材変更・切る工程捏造の完全禁止）
          let prompt = `以下のYouTube料理動画から、レシピを正確に構造化してJSONで出力してください。\n\n`;
          if (videoTitle) {
            prompt += `■ 動画タイトル: 『${videoTitle}』\n`;
          }
          if (authorName) {
            prompt += `■ チャンネル・料理研究家: 『${authorName}』\n`;
          }
          prompt += `■ 動画URL: ${youtubeUrl.trim()}\n\n`;

          if (effectiveDesc) {
            prompt += `■ 動画の概要欄テキスト（投稿者が公式に記載したレシピ・材料情報）:\n${effectiveDesc}\n\n`;
            prompt += `【最重要：厳格遵守ルール（捏造・勝手な具材追加・工程捏造の完全禁止）】\n` +
              `1. 概要欄に記載された食材・部位・調味料と分量を【100%忠実】に出力してください。\n` +
              `2. 【切る工程・下処理の捏造厳禁】: 概要欄やテキストで明示的に「切る」「カットする」「刻む」と指示されていない食材を、勝手に「一口大に切る」等のカット工程として手順に追加しないでください。パックからそのまま加熱する料理も多数あります。\n` +
              `3. 【具材・調味料の追加厳禁】: 概要欄に書かれていない食材（香味野菜、水、油、調味料、薬味など）は、どんなに一般的・常識的であっても絶対に1つも追加しないでください。\n` +
              `4. 【分量の捏造厳禁】: 概要欄記載の数値をそのまま正確に出力し、記載のないものは勝手に数値を捏造せず「適量」としてください。\n` +
              `5. 【部位・種類の改変厳禁】: スライス肉をブロック肉に変えるなど、勝手な変更は一切禁止です。\n` +
              `6. 調理工程は概要欄や動画の流れに沿って整理し、各工程の開始秒数（timeSec: 数値, timeDisplay: "01:25"形式）を付与してください。\n`;
          } else {
            prompt += `【最重要：厳格遵守ルール（ハルシネーションの完全禁止）】\n` +
              `1. 動画タイトル『${videoTitle || youtubeUrl.trim()}』の趣旨に忠実なレシピを作成してください。\n` +
              `2. 【切る工程・不要な下処理の捏造禁止】: 必要最小限の自然な手順のみで構成し、切る必要のない食材のカット工程など無駄な工程を挟まないでください。\n` +
              `3. 余計な香味野菜や装飾的具材を勝手に捏造・追加せず、メイン食材と基本調味料のみでシンプルに構成してください。\n` +
              `4. 各調理工程には、動画内の該当シーンの開始秒数（timeSec: 数値, timeDisplay: "01:25"形式）を必ず推定・付与してください。\n`;
          }
          prompt += `・titleには動画タイトルの装飾（【大人気】や【簡単】など）を整理した綺麗な料理名を設定してください。\n`;

          created = await analyzeWithGemini(
            geminiKey,
            prompt,
            {
              model: settings.gemini_model || 'gemini-3.8-flash',
              sourceType: 'yt',
              sourceBadge: authorName ? `▶ ${authorName}` : '▶ YouTube (Gemini)',
              youtubeUrl: youtubeUrl.trim(),
            }
          );

          if (ytId) {
            created.youtubeId = ytId;
            created.sourceUrl = youtubeUrl.trim();
            created.sourceName = authorName || 'YouTube';
            created.coverImage = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
          }
          if (videoTitle && (!created.title || created.title === '料理名' || created.title.includes('ペペロンチーノ'))) {
            created.title = cleanRecipeTitle(videoTitle) || videoTitle;
          }
        } else if (activeTab === 'x') {
          if (!xPostText.trim()) throw new Error('X（Twitter）のポスト内容を入力してください');
          setCurrentStepText('Gemini AIがXポストから材料と工程を抽出中...');
          created = await analyzeWithGemini(geminiKey, xPostText.trim(), {
            model: settings.gemini_model || 'gemini-3.8-flash',
            sourceType: 'x',
            sourceBadge: '𝕏 ポスト (Gemini)',
          });
        } else if (activeTab === 'memo') {
          if (!memoText.trim()) throw new Error('メモのテキストを入力してください');
          setCurrentStepText('Gemini AIがメモのテキストを構造化レシピに変換中...');
          created = await analyzeWithGemini(geminiKey, memoText.trim(), {
            model: settings.gemini_model || 'gemini-3.8-flash',
            sourceType: 'memo',
            sourceBadge: '📝 メモ (Gemini)',
          });
        } else if (activeTab === 'ai') {
          if (!aiPrompt.trim()) throw new Error('料理の要望を入力してください');
          setCurrentStepText('Gemini AIがオリジナルレシピを考案中...');
          created = await analyzeWithGemini(
            geminiKey,
            `以下の要望に基づき、家庭で美味しく作れる最高のレシピを考案してください：\n${aiPrompt.trim()}`,
            {
              model: settings.gemini_model || 'gemini-3.8-flash',
              sourceType: 'ai',
              sourceBadge: '🤖 Gemini AI考案',
            }
          );
        }
      } else {
        // === 2. サーバーAPIまたはOpenAI経由 ===
        if (activeTab === 'yt') {
          if (!youtubeUrl.trim()) throw new Error('YouTubeのURLを入力してください');
          setCurrentStepText('YouTube動画の字幕・メタデータを取得中...');
          const result = await analyzeApi.youtube(youtubeUrl.trim());
          created = result.recipe;
        } else if (activeTab === 'x') {
          if (!xPostText.trim()) throw new Error('X（Twitter）のポスト内容を入力してください');
          setCurrentStepText('Xポストからレシピ情報をAI抽出中...');
          const result = await analyzeApi.text(xPostText.trim(), 'x');
          created = result.recipe;
        } else if (activeTab === 'memo') {
          if (!memoText.trim()) throw new Error('メモのテキストを入力してください');
          setCurrentStepText('テキスト・メモからレシピ構造をAI解析中...');
          const result = await analyzeApi.text(memoText.trim(), 'memo');
          created = result.recipe;
        } else if (activeTab === 'ai') {
          if (!aiPrompt.trim()) throw new Error('料理の要望を入力してください');
          setCurrentStepText('AIシェフがオリジナルレシピを考案中...');
          const result = await analyzeApi.generate(aiPrompt.trim());
          created = result.recipe;
        }
      }

      if (created) {
        onRecipeCreated(created);
        onClose();
        setYoutubeUrl('');
        setYtDescription('');
        setVideoMeta(null);
        setXPostText('');
        setMemoText('');
        setAiPrompt('');
      }
    } catch (err) {
      setError(err.message || 'レシピの作成・解析に失敗しました。');
    } finally {
      setLoading(false);
      setCurrentStepText('');
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: '620px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="modal-title">✨ レシピの取り込み・新規作成</div>
            <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              {getSettings().gemini_api_key ? `⚡️ Gemini (${getSettings().gemini_model || 'gemini-3.8-flash'})` : '🤖 AI Engine'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* ソース切替タブ */}
          <div className="source-selector-tabs">
            <button
              className={`source-tab-btn ${activeTab === 'yt' ? 'active' : ''}`}
              onClick={() => setActiveTab('yt')}
              disabled={loading}
            >
              ▶ YouTube動画
            </button>
            <button
              className={`source-tab-btn ${activeTab === 'x' ? 'active' : ''}`}
              onClick={() => setActiveTab('x')}
              disabled={loading}
            >
              𝕏 ポスト
            </button>
            <button
              className={`source-tab-btn ${activeTab === 'memo' ? 'active' : ''}`}
              onClick={() => setActiveTab('memo')}
              disabled={loading}
            >
              📝 テキスト / メモ
            </button>
            <button
              className={`source-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
              disabled={loading}
            >
              🤖 AIゼロから生成
            </button>
          </div>

          {/* YouTube入力 */}
          {activeTab === 'yt' && (
            <div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>YouTube URL（通常・Shorts両対応）</span>
                  {fetchingVideo && <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>🔍 動画情報確認中...</span>}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://www.youtube.com/watch?v=... または https://youtu.be/..."
                  value={youtubeUrl}
                  onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* 検出された動画のプレビュー */}
              {videoMeta && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}>
                  {videoMeta.thumbnail && (
                    <img
                      src={videoMeta.thumbnail}
                      alt="thumbnail"
                      style={{ width: '96px', height: '54px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {videoMeta.title || 'YouTube料理動画'}
                    </div>
                    {videoMeta.author && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        👤 {videoMeta.author}
                      </div>
                    )}
                    <div style={{ fontSize: '0.72rem', color: videoMeta.descriptionFetched ? '#059669' : '#d97706', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {videoMeta.descriptionFetched ? (
                        <span>✓ 動画概要欄（材料・手順）を自動取得しました</span>
                      ) : (
                        <span>⚠️ 概要欄の自動取得制限中（下記に概要欄テキストを貼ると100%正確になります）</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 概要欄テキスト入力 */}
              <div className="form-group" style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    動画の概要欄テキスト（材料・分量）
                  </label>
                  {ytDescription.trim() ? (
                    <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0', fontWeight: 600 }}>
                      ✓ 概要欄を反映中（材料・手順・分量を忠実に再現）
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', border: '1px solid #fcd34d', fontWeight: 600 }}>
                      ⚠️ 概要欄の貼り付けを推奨
                    </span>
                  )}
                </div>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '95px', fontSize: '0.8rem', lineHeight: '1.4' }}
                  placeholder="YouTubeの説明欄（もっと見る）にある材料リストやレシピ手順を貼り付けると、投稿者のレシピ通りに100%正確（勝手な具材追加・工程捏造なし）に再現します。"
                  value={ytDescription}
                  onChange={(e) => setYtDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              {!ytDescription.trim() && (
                <div style={{ fontSize: '0.75rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '8px 10px', borderRadius: '6px', marginTop: '6px', lineHeight: 1.45 }}>
                  💡 <strong>おすすめ:</strong> YouTubeの概要欄（「もっと見る」）に記載されている材料・分量をここにコピー＆ペーストすると、不要な具材の捏造やカット工程の混入を防ぎ、動画通りの正確なレシピが作成されます。
                </div>
              )}
            </div>
          )}

          {/* X入力 */}
          {activeTab === 'x' && (
            <div>
              <div className="form-group">
                <label className="form-label">ポスト内容・ツリー</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '120px' }}
                  placeholder="Xのポスト本文やツリーのテキストを貼り付けてください..."
                  value={xPostText}
                  onChange={(e) => setXPostText(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* メモ入力 */}
          {activeTab === 'memo' && (
            <div>
              <div className="form-group">
                <label className="form-label">料理メモ・レシピテキスト</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '120px' }}
                  placeholder="メモ帳のレシピや口頭メモのテキストを入力..."
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* AI生成入力 */}
          {activeTab === 'ai' && (
            <div>
              <div className="form-group">
                <label className="form-label">どんな料理を作りたいですか？</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '100px' }}
                  placeholder="例: 冷蔵庫に余っている豚バラとキャベツで10分で作れる簡単で旨いおつまみパスタ..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: 'var(--radius-xs)',
                color: '#dc2626',
                fontSize: '0.85rem',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* 解析プログレス */}
          {loading && (
            <div className="parsing-progress" style={{ display: 'block' }}>
              <div className="progress-step active">
                <span className="spinner" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                  ⏳
                </span>
                <span>{currentStepText || 'AI解析を実行中...'}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '4px' }}>
                材料・分量・手順・プロの技を構造化しています（通常3〜8秒）
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
            {loading ? '解析中...' : '解析してレシピ作成'}
          </button>
        </div>
      </div>
    </div>
  );
}
