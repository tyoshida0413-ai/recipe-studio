import React, { useState } from 'react';

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
