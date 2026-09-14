import React, { useState } from 'react';
import { analyzeApi } from '../api/client.js';
import { analyzeWithGemini } from '../api/gemini.js';

export default function ImportModal({ isOpen, onClose, onRecipeCreated }) {
  const [activeTab, setActiveTab] = useState('yt'); // yt, x, memo, ai
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [xPostText, setXPostText] = useState('');
  const [memoText, setMemoText] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  const [loading, setLoading] = useState(false);
  const [currentStepText, setCurrentStepText] = useState('');
  const [error, setError] = useState(null);

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
          setCurrentStepText('Gemini AIがYouTube動画情報からレシピを構造化解析中...');
          
          // YouTube IDの抽出
          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
          const match = youtubeUrl.trim().match(regExp);
          const youtubeId = (match && match[2].length === 11) ? match[2] : null;

          created = await analyzeWithGemini(
            geminiKey,
            `YouTube料理動画 URL: ${youtubeUrl.trim()}\nこの動画のレシピ内容（料理名、必要な材料と正確な分量、調理手順、プロのコツ）を詳細に解析して構造化してください。`,
            {
              model: settings.gemini_model || 'gemini-2.0-flash',
              sourceType: 'yt',
              sourceBadge: '▶ YouTube (Gemini)',
            }
          );
          if (youtubeId) {
            created.youtubeId = youtubeId;
            created.sourceUrl = youtubeUrl.trim();
            if (!created.coverImage) {
              created.coverImage = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
            }
          }
        } else if (activeTab === 'x') {
          if (!xPostText.trim()) throw new Error('X（Twitter）のポスト内容を入力してください');
          setCurrentStepText('Gemini AIがXポストから材料と工程を抽出中...');
          created = await analyzeWithGemini(geminiKey, xPostText.trim(), {
            model: settings.gemini_model || 'gemini-2.0-flash',
            sourceType: 'x',
            sourceBadge: '𝕏 ポスト (Gemini)',
          });
        } else if (activeTab === 'memo') {
          if (!memoText.trim()) throw new Error('メモのテキストを入力してください');
          setCurrentStepText('Gemini AIがメモのテキストを構造化レシピに変換中...');
          created = await analyzeWithGemini(geminiKey, memoText.trim(), {
            model: settings.gemini_model || 'gemini-2.0-flash',
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
              model: settings.gemini_model || 'gemini-2.0-flash',
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
          <div className="modal-title">✨ レシピの取り込み・新規作成</div>
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
                <label className="form-label">YouTube URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                💡 動画URLを貼り付けると、AIが材料・正確な分量・手順・調理テクニックを瞬時に自動抽出します。
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
