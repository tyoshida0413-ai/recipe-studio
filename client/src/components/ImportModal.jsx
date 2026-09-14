import React, { useState } from 'react';
import { analyzeApi } from '../api/client.js';

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

  const handleImport = async () => {
    setLoading(true);
    setError(null);

    try {
      let created = null;

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

      if (created) {
        onRecipeCreated(created);
        onClose();
        // フォームリセット
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
                💡 動画の字幕（文字起こし）と概要欄を自動解析し、材料・分量・手順・調理テクニックを瞬時に構造化します。
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
                OpenAI GPT-4oが材料・手順・下処理ガイドを構築しています（通常5〜15秒）
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
