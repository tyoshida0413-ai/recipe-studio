import React, { useState, useEffect } from 'react';
import { fetchYouTubeInfo } from '../utils/youtube.js';

/**
 * YouTube動画からのAI再生成モーダル
 * 概要欄（材料・分量）の確認・貼り付けを必須または推奨とし、
 * 動画や概要欄を無視したタイトル推測によるハルシネーション（勝手なカット工程や具材捏造）を根絶します。
 */
export default function ReAnalyzeModal({ isOpen, onClose, recipe, onConfirm, isReAnalyzing }) {
  const [descriptionText, setDescriptionText] = useState('');
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [fetchedMeta, setFetchedMeta] = useState(null);
  const [warnNoDesc, setWarnNoDesc] = useState(false);

  useEffect(() => {
    if (isOpen && recipe?.youtubeId) {
      setDescriptionText('');
      setWarnNoDesc(false);
      setFetchingInfo(true);
      fetchYouTubeInfo(recipe.youtubeId)
        .then((info) => {
          setFetchedMeta(info);
          if (info?.description) {
            setDescriptionText(info.description);
          }
        })
        .catch((e) => {
          console.warn('YouTube info fetch failed:', e);
        })
        .finally(() => {
          setFetchingInfo(false);
        });
    }
  }, [isOpen, recipe?.youtubeId]);

  if (!isOpen || !recipe) return null;

  const handleStart = () => {
    if (!descriptionText.trim() && !warnNoDesc) {
      setWarnNoDesc(true);
      return;
    }
    onConfirm(descriptionText.trim(), fetchedMeta);
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && !isReAnalyzing && onClose()}>
      <div className="modal-card" style={{ width: '600px', maxWidth: '95vw' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="modal-title">🔄 動画からレシピをAI再生成</div>
            <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              高精度照合モード
            </span>
          </div>
          <button className="modal-close" onClick={onClose} disabled={isReAnalyzing}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* 動画情報カード */}
          <div style={{
            padding: '10px 12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '14px',
          }}>
            <img
              src={`https://img.youtube.com/vi/${recipe.youtubeId}/hqdefault.jpg`}
              alt="thumbnail"
              style={{ width: '96px', height: '54px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fetchedMeta?.title || recipe.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                👤 {fetchedMeta?.author || recipe.sourceName || 'YouTube動画'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '2px' }}>
                URL: https://www.youtube.com/watch?v={recipe.youtubeId}
              </div>
            </div>
          </div>

          {/* 説明・注意喚起 */}
          <div style={{
            fontSize: '0.78rem',
            color: '#1e3a8a',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            padding: '10px 12px',
            borderRadius: '8px',
            marginBottom: '12px',
            lineHeight: 1.5,
          }}>
            <strong>💡 なぜ概要欄が必要なのか:</strong><br />
            YouTubeの仕様上、外部APIからは概要欄や動画内音声が自動取得できない場合があります。
            タイトルだけの推測に頼ると、AIが一般的なレシピを勝手に想像して<strong>「切っていない豚バラ肉を切る工程」や「動画にない余計な具材・間違った分量」を捏造（ハルシネーション）</strong>してしまいます。<br />
            YouTubeの概要欄（「もっと見る」）から材料・分量・作り方テキストをコピーして下に貼り付けることで、<strong>動画通りの100%正確なレシピ</strong>が生成されます。
          </div>

          {/* 概要欄テキスト入力エリア */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem' }}>
                動画の概要欄テキスト（材料・分量・作り方）
              </label>
              {fetchingInfo ? (
                <span style={{ fontSize: '0.72rem', color: '#0284c7' }}>🔍 概要欄を自動確認中...</span>
              ) : descriptionText.trim() ? (
                <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0', fontWeight: 600 }}>
                  ✓ 概要欄を反映中
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: '4px', border: '1px solid #fde68a', fontWeight: 600 }}>
                  ⚠️ コピペ貼り付けを推奨
                </span>
              )}
            </div>

            <textarea
              className="form-textarea"
              style={{ minHeight: '140px', fontSize: '0.8rem', lineHeight: 1.45 }}
              placeholder="YouTubeの動画説明欄（「もっと見る」）に書かれている材料リストや手順をここに貼り付けてください...&#10;&#10;例:&#10;【材料】&#10;豚バラスライス 200g&#10;醤油 大さじ2&#10;みりん 大さじ2&#10;白米 2合"
              value={descriptionText}
              onChange={(e) => {
                setDescriptionText(e.target.value);
                setWarnNoDesc(false);
              }}
              disabled={isReAnalyzing}
            />
          </div>

          {/* 概要欄なし警告 */}
          {warnNoDesc && !descriptionText.trim() && (
            <div style={{
              fontSize: '0.76rem',
              color: '#b91c1c',
              background: '#fef2f2',
              border: '1.5px solid #f87171',
              padding: '10px 12px',
              borderRadius: '8px',
              marginTop: '8px',
              lineHeight: 1.5,
            }}>
              <strong>⚠️ 警告: 概要欄テキストが入力されていません！</strong><br />
              概要欄がない場合、動画タイトルからAIが一般的なレシピを推測するため、動画と異なる分量や、切っていない豚バラ肉のカット工程などが混入するリスク（ハルシネーション）があります。<br />
              可能な限りYouTubeの「もっと見る」から材料テキストをコピーして貼り付けてください。このままタイトル推測で続行する場合は、もう一度「AI再生成を実行」ボタンを押してください。
            </div>
          )}

          {isReAnalyzing && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}>
              <span className="spinner" style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: '8px' }}>⏳</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                Gemini AIが高精度レシピを構造化中...
              </span>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                概要欄の材料・分量を100%忠実に反映し、不要な工程を排除しています
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isReAnalyzing}>
            キャンセル
          </button>
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={isReAnalyzing}
            style={{
              background: descriptionText.trim() ? '#2563eb' : (warnNoDesc ? '#dc2626' : '#0284c7'),
              borderColor: descriptionText.trim() ? '#1d4ed8' : (warnNoDesc ? '#b91c1c' : '#0369a1'),
              fontWeight: 700,
            }}
          >
            {isReAnalyzing ? '再生成中...' : (warnNoDesc && !descriptionText.trim() ? 'このままタイトル推測で続行' : '✨ この内容でAI再生成を実行')}
          </button>
        </div>
      </div>
    </div>
  );
}
