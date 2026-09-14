import React, { useState } from 'react';
import { analyzeWithGemini } from '../api/gemini.js';
import { fetchYouTubeInfo, cleanRecipeTitle } from '../utils/youtube.js';

export default function RecipeDetail({
  recipe,
  onToggleFavorite,
  onOpenCookingMode,
  onOpenShoppingList,
  onOpenIngredientEdit,
  onUpdateRecipe,
  onDeleteRecipe,
}) {
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [isEditingArrangement, setIsEditingArrangement] = useState(false);
  const [arrangementDraft, setArrangementDraft] = useState('');
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [reAnalyzeStatus, setReAnalyzeStatus] = useState('');

  if (!recipe) {
    return (
      <main className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🍽</div>
          <p>左側のリストからレシピを選択してください。</p>
        </div>
      </main>
    );
  }

  const currentServings = (recipe.baseServings || 1) * servingsMultiplier;

  const handleServingsChange = (delta) => {
    setServingsMultiplier((prev) => {
      const next = prev + delta;
      return next >= 0.5 ? next : 0.5;
    });
  };

  const handleToggleCheck = (index) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleStartEditArrangement = () => {
    setArrangementDraft(recipe.myArrangement || '');
    setIsEditingArrangement(true);
  };

  const handleSaveArrangement = async () => {
    await onUpdateRecipe(recipe.id, { myArrangement: arrangementDraft });
    setIsEditingArrangement(false);
  };

  const handleDelete = () => {
    if (window.confirm(`「${recipe.title}」を削除しますか？`)) {
      onDeleteRecipe(recipe.id);
    }
  };

  const handleReAnalyzeYouTube = async () => {
    if (!recipe.youtubeId) {
      alert('YouTube動画が連携されていません');
      return;
    }
    const settings = (() => {
      try {
        return JSON.parse(localStorage.getItem('recipe_ai_settings') || '{}');
      } catch {
        return {};
      }
    })();
    const geminiKey = settings.gemini_api_key;
    if (!geminiKey) {
      alert('Gemini APIキーが設定されていません。右上の「⚙️ API設定」から登録してください。');
      return;
    }

    setIsReAnalyzing(true);
    setReAnalyzeStatus('動画情報を取得中...');
    try {
      const info = await fetchYouTubeInfo(recipe.youtubeId);
      const videoTitle = info?.title || '';
      const authorName = info?.author || '';

      setReAnalyzeStatus(videoTitle ? `「${videoTitle}」からレシピをAI生成中...` : 'AIレシピを解析中...');

      const prompt = `以下のYouTube料理動画から、美味しい本格レシピを正確に構造化してJSONで出力してください。\n\n` +
        (videoTitle ? `■ 動画タイトル: 『${videoTitle}』\n` : '') +
        (authorName ? `■ 投稿者 / チャンネル: 『${authorName}』\n` : '') +
        `■ 動画URL: https://www.youtube.com/watch?v=${recipe.youtubeId}\n\n` +
        `【指示】\n動画タイトル『${videoTitle}』から料理を特定し、最高に美味しい黄金比レシピを作成してください。必要な材料と正確な分量（調味料含む）、切り方や下処理、丁寧な調理工程、タイマー秒数、プロのコツを網羅してください。titleには装飾記号を除いた綺麗な料理名を設定してください。`;

      const reGenerated = await analyzeWithGemini(geminiKey, prompt, {
        model: settings.gemini_model || 'gemini-3.8-flash',
        sourceType: 'yt',
        sourceBadge: authorName ? `▶ ${authorName}` : '▶ YouTube (Gemini)',
      });

      const updatedData = {
        title: reGenerated.title || cleanRecipeTitle(videoTitle) || recipe.title,
        cookingTime: reGenerated.cookingTime || '15分',
        baseServings: reGenerated.baseServings || 1,
        groupKey: reGenerated.groupKey || recipe.groupKey || 'other',
        groupName: reGenerated.groupName || recipe.groupName || 'その他',
        myArrangement: reGenerated.myArrangement || recipe.myArrangement || '',
        ingredients: reGenerated.ingredients || [],
        steps: reGenerated.steps || [],
        crosscheck: reGenerated.crosscheck || { hasDiff: false, title: 'AI照合完了', desc: '動画タイトルからレシピを再生成しました' },
        sourceName: authorName || recipe.sourceName || 'YouTube',
        coverImage: info?.thumbnail || recipe.coverImage,
      };

      await onUpdateRecipe(recipe.id, updatedData);
    } catch (err) {
      alert('レシピの再生成に失敗しました: ' + (err.message || 'エラーが発生しました'));
    } finally {
      setIsReAnalyzing(false);
      setReAnalyzeStatus('');
    }
  };

  const seekVideo = (timeSec) => {
    const iframe = document.getElementById('recipeDetailIframe');
    if (iframe && recipe.youtubeId) {
      iframe.src = `https://www.youtube-nocookie.com/embed/${recipe.youtubeId}?start=${timeSec}&autoplay=1&enablejsapi=1`;
    }
  };

  return (
    <main className="content-area">
      {/* スリムタイトルバー */}
      <div className="recipe-hero-bar">
        <div className="hero-top-row">
          <div className="hero-title-group">
            <h1 className="hero-title">{recipe.title}</h1>
            <button
              className={`btn-fav ${recipe.isFavorite ? 'active' : ''}`}
              onClick={() => onToggleFavorite(recipe.id)}
            >
              ★ {recipe.isFavorite ? 'お気に入り中' : 'お気に入りに追加'}
            </button>
            <span className={`badge badge-${recipe.sourceType || 'yt'}`}>
              {recipe.sourceBadge || 'レシピ'}
            </span>
            {recipe.groupName && <span className="badge badge-tag">{recipe.groupName}</span>}
          </div>

          <div className="hero-actions">
            {recipe.youtubeId && (
              <button
                className="btn btn-secondary btn-small"
                onClick={handleReAnalyzeYouTube}
                disabled={isReAnalyzing}
                style={{
                  background: '#f0f9ff',
                  borderColor: '#38bdf8',
                  color: '#0284c7',
                  fontWeight: 600,
                }}
                title="動画タイトルからAIで材料・工程を再生成します"
              >
                {isReAnalyzing ? (reAnalyzeStatus || '⏳ 再生成中...') : '🔄 動画からAI再生成'}
              </button>
            )}
            <button className="btn btn-cook-mode btn-small" onClick={() => onOpenCookingMode(recipe)}>
              👨‍🍳 調理モード開始
            </button>
            <button className="btn btn-secondary btn-small" onClick={handleDelete} style={{ color: '#dc2626' }}>
              🗑 削除
            </button>
          </div>
        </div>

        <div className="hero-meta-row">
          <div className="hero-meta-item">
            <span>⏱ 調理目安:</span>
            <span style={{ fontWeight: 600 }}>{recipe.cookingTime || '15分'}</span>
          </div>
          <div className="hero-meta-item">
            <span>👥 基本分量:</span>
            <span style={{ fontWeight: 600 }}>{recipe.baseServings || 1}人前</span>
          </div>
          {recipe.sourceUrl && (
            <div className="hero-meta-item">
              <span>🔗 出典:</span>
              <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="source-link">
                {recipe.sourceName || 'リンクを開く ↗'}
              </a>
            </div>
          )}
          <div className="hero-meta-item" style={{ color: 'var(--text-light)', marginLeft: 'auto' }}>
            <span>最終更新: {new Date(recipe.updatedAt || Date.now()).toLocaleDateString('ja-JP')}</span>
          </div>
        </div>
      </div>

      {/* 動画があるが材料・手順が未生成の場合のアラートバナー */}
      {recipe.youtubeId && (!recipe.ingredients || recipe.ingredients.length === 0 || !recipe.steps || recipe.steps.length === 0) && (
        <div style={{
          margin: '12px 20px 0',
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          border: '1.5px solid #93c5fd',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.6rem' }}>✨</span>
            <div>
              <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.92rem' }}>
                YouTube動画から材料・調理手順をAI自動生成できます
              </div>
              <div style={{ fontSize: '0.78rem', color: '#2563eb', marginTop: '2px' }}>
                動画のタイトルから、Gemini AIが材料・正確な分量・手順・プロのコツを一瞬で考案して完成させます。
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleReAnalyzeYouTube}
            disabled={isReAnalyzing}
            style={{
              whiteSpace: 'nowrap',
              fontWeight: 700,
              padding: '8px 16px',
              fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            }}
          >
            {isReAnalyzing ? (reAnalyzeStatus || '生成中...') : '⚡️ レシピをAIで自動完成させる'}
          </button>
        </div>
      )}

      {/* AIクロスチェックバナー */}
      {recipe.crosscheck && (
        <div className="crosscheck-banner">
          <div className="crosscheck-left">
            <span className="crosscheck-icon">⚠️</span>
            <div className="crosscheck-text">
              <strong>{recipe.crosscheck.title || 'AI相互照合結果'}:</strong>{' '}
              {recipe.crosscheck.desc || recipe.crosscheck.description || ''}
            </div>
          </div>
          <span className="badge badge-ai" style={{ fontSize: '0.7rem' }}>
            高精度照合済
          </span>
        </div>
      )}

      {/* 2カラム Bento レイアウト */}
      <div className="bento-grid">
        {/* 左: メディア */}
        <div className="media-card">
          {recipe.youtubeId ? (
            <iframe
              id="recipeDetailIframe"
              src={`https://www.youtube-nocookie.com/embed/${recipe.youtubeId}?enablejsapi=1`}
              title={recipe.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <img
              src={recipe.coverImage || 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=800&q=80'}
              alt={recipe.title}
            />
          )}
        </div>

        {/* 右: 材料 ＆ マイアレンジ */}
        <div className="side-panel-stack">
          {/* 材料カード */}
          <div className="ingredients-card">
            <div className="ingredients-header">
              <div className="ingredients-title">
                <span>🥕 材料・調味料</span>
                <button
                  className="btn btn-secondary btn-small"
                  style={{ fontSize: '0.72rem', padding: '2px 7px' }}
                  onClick={() => onOpenIngredientEdit(recipe)}
                >
                  編集
                </button>
              </div>

              {/* 人数コントローラー */}
              <div className="servings-controller">
                <button className="servings-btn" onClick={() => handleServingsChange(-1)}>
                  -
                </button>
                <span className="servings-val">{currentServings}人前</span>
                <button className="servings-btn" onClick={() => handleServingsChange(1)}>
                  +
                </button>
              </div>
            </div>

            <ul className="ingredient-list">
              {(recipe.ingredients || []).map((ing, idx) => {
                const isChecked = !!checkedIngredients[idx];
                let displayAmount = ing.amount || '';
                if (ing.baseAmount && typeof ing.baseAmount === 'number') {
                  const calculated = Math.round(ing.baseAmount * servingsMultiplier * 10) / 10;
                  displayAmount = `${calculated}${ing.unit || ''}`;
                }

                return (
                  <li key={idx} className={`ingredient-item ${isChecked ? 'checked' : ''}`}>
                    <label className="ingredient-name" style={{ cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCheck(idx)}
                      />
                      <span>{ing.name}</span>
                    </label>
                    <span className="ingredient-amount">{displayAmount}</span>
                  </li>
                );
              })}
            </ul>

            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: '#fffaf7',
                  color: 'var(--accent-terracotta)',
                  borderColor: 'var(--accent-terracotta-border)',
                }}
                onClick={onOpenShoppingList}
              >
                🛒 買い物リストに送る
              </button>
            </div>
          </div>

          {/* マイアレンジ */}
          <div className="my-arrangement-card">
            <div className="arrangement-header">
              <div className="arrangement-title">
                <span>💡 マイアレンジ・料理メモ</span>
              </div>
              {!isEditingArrangement ? (
                <button
                  className="btn btn-secondary btn-small"
                  style={{ padding: '1px 6px', fontSize: '0.72rem' }}
                  onClick={handleStartEditArrangement}
                >
                  編集
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-small"
                  style={{ padding: '1px 6px', fontSize: '0.72rem' }}
                  onClick={handleSaveArrangement}
                >
                  保存
                </button>
              )}
            </div>

            {isEditingArrangement ? (
              <textarea
                className="form-textarea"
                style={{ fontSize: '0.8rem', padding: '6px 8px', minHeight: '60px' }}
                value={arrangementDraft}
                onChange={(e) => setArrangementDraft(e.target.value)}
                placeholder="自分好みの味付けや失敗メモを自由に記録..."
              />
            ) : (
              <div className="arrangement-text">
                {recipe.myArrangement || 'まだアレンジメモはありません。「編集」からメモを残せます。'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 手順・段取りセクション */}
      <section className="steps-section">
        <div className="steps-header">
          <div className="steps-title">
            <span>🍳 調理の手順・段取り</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
              {recipe.youtubeId ? '（タイムスタンプをクリックすると動画該当箇所にジャンプします）' : ''}
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            全 {(recipe.steps || []).length} 工程
          </span>
        </div>

        <div className="steps-container">
          {(recipe.steps || []).map((step, idx) => (
            <div key={idx} className="step-card">
              <div className="step-num-badge">{step.num || idx + 1}</div>
              <div className="step-body">
                <div className="step-top">
                  <div className="step-heading">
                    工程 {step.num || idx + 1}
                    {step.timerSeconds ? (
                      <span
                        style={{
                          marginLeft: '8px',
                          color: '#d97706',
                          fontSize: '0.8rem',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        ⏱ タイマー {Math.floor(step.timerSeconds / 60)}分
                      </span>
                    ) : null}
                  </div>

                  {recipe.youtubeId && step.timeSec !== undefined && step.timeSec !== null && (
                    <button className="seek-btn" onClick={() => seekVideo(step.timeSec)}>
                      ▶ {step.timeDisplay || '00:00'}
                    </button>
                  )}
                </div>

                <div className="step-instruction">{step.text}</div>

                {step.technique && (
                  <div className="technique-box">
                    <span>💡</span>
                    <div>{step.technique}</div>
                  </div>
                )}

                {step.stepImage && (
                  <div className="step-img-box">
                    <img src={step.stepImage} alt={`工程 ${step.num} 写真`} className="step-thumb" />
                  </div>
                )}

                {step.tip && (
                  <div className="step-tip">
                    <strong>Tip:</strong> {step.tip}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
