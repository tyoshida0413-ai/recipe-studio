import React, { useState } from 'react';
import { analyzeWithGemini } from '../api/gemini.js';
import { fetchYouTubeInfo, cleanRecipeTitle } from '../utils/youtube.js';
import EditModal from './EditModal.jsx';

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
  const [isEditOpen, setIsEditOpen] = useState(false);

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
      const videoDesc = info?.description || '';

      setReAnalyzeStatus(videoTitle ? `「${videoTitle}」からレシピをAI生成中...` : 'AIレシピを解析中...');

      let prompt = `以下のYouTube料理動画から、美味しい本格レシピを正確に構造化してJSONで出力してください。\n\n` +
        (videoTitle ? `■ 動画タイトル: 『${videoTitle}』\n` : '') +
        (authorName ? `■ 投稿者 / チャンネル: 『${authorName}』\n` : '') +
        `■ 動画URL: https://www.youtube.com/watch?v=${recipe.youtubeId}\n\n`;

      if (videoDesc) {
        prompt += `■ 動画の概要欄テキスト（投稿者が公式に記載したレシピ・材料情報）:\n${videoDesc}\n\n` +
          `【最重要：厳格遵守ルール（捏造・勝手な具材追加・工程捏造の完全禁止）】\n` +
          `1. 概要欄に記載された食材・部位・調味料と分量を【100%忠実】に出力してください。\n` +
          `2. 【切る工程・下処理の捏造厳禁】: 概要欄やテキストで明示的に切る・刻むと指示されていない食材を勝手に「一口大に切る」等のカット工程として手順に追加しないでください。\n` +
          `3. 【具材・調味料の追加厳禁】: 概要欄に書かれていない食材（香味野菜、水、油、調味料、薬味など）は、どんなに一般的・常識的であっても絶対に1つも追加しないでください。\n` +
          `4. 【分量の捏造厳禁】: 概要欄記載の数値をそのまま正確に出力し、記載のないものは勝手に数値を捏造せず「適量」としてください。\n` +
          `5. 【部位・種類の改変厳禁】: スライス肉をブロック肉に変えるなど、勝手な変更は一切禁止です。\n` +
          `6. 調理工程は概要欄や動画の流れに沿って整理し、各工程の開始秒数（timeSec: 数値, timeDisplay: "01:25"形式）を付与してください。\n`;
      } else {
        prompt += `【最重要：厳格遵守ルール（ハルシネーションの完全禁止）】\n` +
          `1. 動画タイトル『${videoTitle}』の趣旨に忠実なレシピを作成してください。\n` +
          `2. 【切る工程・不要な下処理の捏造禁止】: 必要最小限の自然な手順のみで構成し、切る必要のない食材のカット工程など無駄な工程を挟まないでください。\n` +
          `3. 余計な香味野菜や装飾的具材を勝手に捏造・追加せず、メイン食材と基本調味料のみでシンプルに構成してください。\n` +
          `4. 各調理工程には、動画内の該当シーンの開始秒数（timeSec: 数値, timeDisplay: "01:25"形式）を必ず推定・付与してください。\n`;
      }
      prompt += `・titleには動画タイトルの装飾記号を除いた綺麗な料理名を設定してください。\n`;

      const reGenerated = await analyzeWithGemini(geminiKey, prompt, {
        model: settings.gemini_model || 'gemini-3.8-flash',
        sourceType: 'yt',
        sourceBadge: authorName ? `▶ ${authorName}` : '▶ YouTube (Gemini)',
        youtubeUrl: `https://www.youtube.com/watch?v=${recipe.youtubeId}`,
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
    if (!iframe || !recipe.youtubeId) return;

    const seconds = typeof timeSec === 'number' ? timeSec : parseInt(timeSec, 10) || 0;

    // 1. postMessage で seekTo & playVideo
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true],
        }), '*');
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: [],
        }), '*');
      }
    } catch (e) {
      console.warn('postMessage seek failed:', e);
    }

    // 2. フォールバック (src更新)
    if (!iframe.src || !iframe.src.includes(`start=${seconds}`)) {
      iframe.src = `https://www.youtube-nocookie.com/embed/${recipe.youtubeId}?start=${seconds}&autoplay=1&enablejsapi=1`;
    }

    // 3. 動画位置へスムーズスクロール
    const mediaCard = document.querySelector('.media-card');
    if (mediaCard) {
      mediaCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setIsEditOpen(true)}
              title="料理名、調理時間、人数、グループ、写真、メモを編集"
            >
              ✏️ レシピ編集
            </button>
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

                  {recipe.youtubeId && (() => {
                    const timeSec = (step.timeSec !== undefined && step.timeSec !== null) ? step.timeSec : idx * 35;
                    const m = Math.floor(timeSec / 60);
                    const s = timeSec % 60;
                    const timeDisplay = step.timeDisplay || `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    return (
                      <button
                        className="seek-btn"
                        onClick={() => seekVideo(timeSec)}
                        title="動画の該当箇所から再生"
                      >
                        ▶ {timeDisplay} から頭出し
                      </button>
                    );
                  })()}
                </div>

                <div className="step-instruction">{step.text}</div>

                {step.usedIngredients && step.usedIngredients.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
                    {step.usedIngredients.map((ing, iIdx) => (
                      <span
                        key={iIdx}
                        style={{
                          fontSize: '0.75rem',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          color: 'var(--text-body)',
                        }}
                      >
                        🧺 {ing.name} <strong style={{ color: 'var(--accent-terracotta)', fontFamily: "'JetBrains Mono', monospace" }}>{ing.amount}</strong>
                      </span>
                    ))}
                  </div>
                )}

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

      {/* レシピ基本情報 編集モーダル */}
      <EditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        recipe={recipe}
        onSave={onUpdateRecipe}
      />
    </main>
  );
}
