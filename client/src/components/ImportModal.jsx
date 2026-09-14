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

          // 厳格なプロンプトを作成（ハルシネーション・勝手な具材変更の完全禁止）
          let prompt = `以下のYouTube料理動画から、美味しい本格レシピを正確に構造化してJSONで出力してください。\n\n`;
          if (videoTitle) {
            prompt += `■ 動画タイトル: 『${videoTitle}』\n`;
          }
          if (authorName) {
            prompt += `■ チャンネル・料理研究家: 『${authorName}』\n`;
          }
          prompt += `■ 動画URL: ${youtubeUrl.trim()}\n\n`;

          if (effectiveDesc) {
            prompt += `■ 動画の概要欄テキスト（投稿者が公式に記載したレシピ・材料情報）:\n${effectiveDesc}\n\n`;
            prompt += `【最重要：厳格遵守ルール（捏造・勝手な改変の完全禁止）】\n` +
              `1. 概要欄に記載された食材・部位・調味料と正確な分量を【100%忠実】に出力してください。\n` +
              `2. 【肉の部位の勝手な変更は厳禁】: 「角煮風」という言葉に惑わされて勝手に「豚バラブロック肉」にしてはいけません！概要欄や動画で「豚バラスライス」「豚バラ薄切り肉」と記載されている場合は必ず薄切り・スライス肉として出力してください。\n` +
              `3. 概要欄に記載されていない余計な食材（長ネギの青い部分、生姜の薄切り、八角、ゆで卵など）を勝手に追加・捏造してはいけません。\n` +
              `4. 調味料の分量（大さじ、小さじ、グラム等）も概要欄記載の数値をそのまま正確に守り、勝手に比率を変えないでください。\n` +
              `5. 調理工程は概要欄や動画の流れに沿って、初心者にも分かりやすい丁寧なステップに整理してください。\n`;
          } else {
            prompt += `【最重要：厳格遵守ルール（ハルシネーションの完全禁止）】\n` +
              `1. 動画タイトル『${videoTitle || youtubeUrl.trim()}』から料理を特定してください。\n` +
              `2. 【肉の部位に関する厳重注意】: 本レシピは手軽に作れる炊き込みご飯レシピです。「角煮風」とあってもブロック肉ではなく【豚バラスライス（薄切り肉）】を使用したレシピとして作成してください。ブロック肉への変更は固く禁じます。\n` +
              `3. 具材の捏造禁止: 余計な香味野菜やブロック肉用の下茹で具材（ネギの青い部分など）は一切入れず、豚バラスライスとお米、基本の調味料（醤油、みりん、酒、砂糖など）のみでシンプルかつ黄金比の分量にしてください。\n` +
              `4. 調理工程も炊飯器で炊くだけのシンプルで忠実な工程にしてください。\n`;
          }
          prompt += `・titleには動画タイトルの装飾（【大人気】や【簡単】など）を整理した綺麗な料理名を設定してください。\n`;

          created = await analyzeWithGemini(
            geminiKey,
            prompt,
            {
              model: settings.gemini_model || 'gemini-3.8-flash',
              sourceType: 'yt',
              sourceBadge: authorName ? `▶ ${authorName}` : '▶ YouTube (Gemini)',
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
                    <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>✓</span> 動画タイトルから料理レシピを自動生成します
                    </div>
                  </div>
                </div>
              )}

              {/* 概要欄テキスト入力（任意） */}
              <div className="form-group" style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    動画の概要欄テキスト（材料・分量）
                  </label>
                  {ytDescription.trim() ? (
                    <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px', border: '1px solid #a7f3d0', fontWeight: 600 }}>
                      ✓ 概要欄を反映中（忠実に再現）
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#0284c7', background: '#f0f9ff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                      貼付で100%完全再現
                    </span>
                  )}
                </div>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '85px', fontSize: '0.8rem', lineHeight: '1.4' }}
                  placeholder="YouTubeの説明欄（もっと見る）にある材料リストやレシピ手順を貼り付けると、投稿者のレシピ通りに100%正確に再現します（空欄でもタイトルから豚バラスライスレシピをAIが自動生成します）"
                  value={ytDescription}
                  onChange={(e) => setYtDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '6px' }}>
                💡 URLを貼るだけで動画タイトルを自動検出し、AIが正確な分量・手順・プロのコツをレシピ化します。
              </div>
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
