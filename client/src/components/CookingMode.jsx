import React, { useState, useEffect, useRef } from 'react';

export default function CookingMode({ recipe, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // タイマー状態
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  const steps = recipe?.steps || [];
  const currentStep = steps[currentStepIndex] || {
    num: 1,
    text: '手順情報がありません',
    usedIngredients: [],
    timerSeconds: 0,
  };

  // ステップが切り替わったときにタイマー秒数を初期化
  useEffect(() => {
    if (currentStep.timerSeconds && currentStep.timerSeconds > 0) {
      setTimerSecondsLeft(currentStep.timerSeconds);
    } else {
      setTimerSecondsLeft(0);
    }
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [currentStepIndex, currentStep]);

  // タイマーカウントダウン処理
  useEffect(() => {
    if (isTimerRunning && timerSecondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            // タイマー完了アラーム音
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              osc.start();
              gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1.2);
              setTimeout(() => osc.stop(), 1300);
            } catch (e) {
              console.log('AudioContext not allowed');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timerSecondsLeft]);

  // キーボードナビゲーション (矢印キーで移動, Spaceでタイマー, Escで閉じる)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (timerSecondsLeft > 0) {
          setIsTimerRunning((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, steps.length, timerSecondsLeft, onClose]);

  const formatTimerDigits = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const jumpToVideoTime = (timeSec) => {
    if (recipe?.youtubeId && timeSec !== undefined) {
      window.open(
        `https://www.youtube.com/watch?v=${recipe.youtubeId}&t=${timeSec}s`,
        '_blank'
      );
    }
  };

  return (
    <div
      className={`cooking-mode-overlay active ${isDarkMode ? 'dark-mode' : ''} ${
        isCompact ? 'compact-mode' : ''
      }`}
    >
      {/* ヘッダー */}
      <div className="cooking-mode-header">
        <div className="cooking-header-left">
          <span className="cooking-chef-badge">👨‍🍳 調理モード</span>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="cooking-recipe-title">{recipe?.title}</div>
            <div className="cooking-recipe-subtitle">
              目安 {recipe?.cookingTime || '15分'} • {recipe?.baseServings || 1}人前
            </div>
          </div>
        </div>

        {/* プログレスドット */}
        <div className="cooking-progress-dots">
          {steps.map((_, idx) => {
            let dotClass = 'cooking-dot';
            if (idx === currentStepIndex) dotClass += ' active';
            else if (idx < currentStepIndex) dotClass += ' passed';
            return (
              <div
                key={idx}
                className={dotClass}
                onClick={() => setCurrentStepIndex(idx)}
                title={`工程 ${idx + 1}`}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setIsCompact((prev) => !prev)}
            title="情報密度の切り替え"
          >
            {isCompact ? '標準' : '縮小'}
          </button>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setIsDarkMode((prev) => !prev)}
            title="ダークモード切り替え"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button
            className="btn btn-secondary btn-small"
            onClick={onClose}
            style={{ fontWeight: 700 }}
          >
            ✕ 閉じる (Esc)
          </button>
        </div>
      </div>

      {/* 中央メイン領域 (1画面収容スプリット) */}
      <div className="cooking-main-split">
        {/* 左カラム: 手順写真 / 動画リンク / 使用材料 */}
        <div className="cooking-media-col">
          <div className="cooking-media-frame">
            <img
              src={
                currentStep.stepImage ||
                recipe?.coverImage ||
                'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=800&q=80'
              }
              alt={`工程 ${currentStep.num || currentStepIndex + 1}`}
              className="cooking-step-image"
            />
            <div className="cooking-media-badge">工程 {currentStep.num || currentStepIndex + 1}</div>

            {recipe?.youtubeId && currentStep.timeSec !== undefined && (
              <button
                className="cooking-video-jump-btn"
                onClick={() => jumpToVideoTime(currentStep.timeSec)}
              >
                ▶ 動画 {currentStep.timeDisplay || '再生'}
              </button>
            )}
          </div>

          {/* この工程で使う材料ボックス */}
          {currentStep.usedIngredients && currentStep.usedIngredients.length > 0 && (
            <div className="cooking-step-ingredients-box">
              <div className="cooking-step-ing-title">
                <span>🥕 この工程で使う材料</span>
              </div>
              <div className="cooking-step-ing-tags">
                {currentStep.usedIngredients.map((item, idx) => (
                  <span key={idx} className="cooking-step-ing-tag">
                    {item.name} <strong>{item.amount}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右カラム: テキスト・タイマー・アドバイス */}
        <div className="cooking-content-col">
          <div className="cooking-step-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cooking-step-pill">
                STEP {currentStep.num || currentStepIndex + 1}
              </span>
              <span className="cooking-step-count">
                {currentStepIndex + 1} / {steps.length}
              </span>
            </div>

            {/* インライン・タイマー */}
            {timerSecondsLeft > 0 || currentStep.timerSeconds > 0 ? (
              <div className="cooking-timer-inline">
                <span className="cooking-timer-label">⏱ TIMER</span>
                <span className="cooking-timer-digits">
                  {formatTimerDigits(timerSecondsLeft)}
                </span>
                <button
                  className={`btn ${
                    isTimerRunning ? 'btn-secondary' : 'btn-primary'
                  } btn-timer-inline`}
                  onClick={() => setIsTimerRunning((prev) => !prev)}
                >
                  {isTimerRunning ? '一時停止' : 'スタート'}
                </button>
                <button
                  className="btn btn-secondary btn-timer-inline"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSecondsLeft(currentStep.timerSeconds || 0);
                  }}
                >
                  リセット
                </button>
              </div>
            ) : null}
          </div>

          {/* 手順テキスト（大きなフォントで自動折り返し） */}
          <div className="cooking-text-giant">{currentStep.text}</div>

          {/* 切り方・下処理ガイド or コツ */}
          {(currentStep.technique || currentStep.tip) && (
            <div className="cooking-advice-card">
              <div className="cooking-advice-header">
                <span>💡</span>
                <strong>
                  {currentStep.technique ? 'プロの技・下処理' : '調理のコツ'}
                </strong>
              </div>
              <div className="cooking-advice-body">
                {currentStep.technique || currentStep.tip}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フッターナビゲーション */}
      <div className="cooking-nav-bar">
        <button
          className="btn btn-secondary cooking-nav-btn"
          disabled={currentStepIndex === 0}
          onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
          style={{ opacity: currentStepIndex === 0 ? 0.4 : 1 }}
        >
          ◀ 前の工程 (←)
        </button>

        {/* タイムラインピル */}
        <div className="cooking-step-timeline">
          {steps.map((step, idx) => (
            <button
              key={idx}
              className={`timeline-pill ${idx === currentStepIndex ? 'active' : ''}`}
              onClick={() => setCurrentStepIndex(idx)}
            >
              #{step.num || idx + 1}{' '}
              {step.text.length > 8 ? `${step.text.slice(0, 8)}...` : step.text}
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary cooking-nav-btn"
          disabled={currentStepIndex === steps.length - 1}
          onClick={() =>
            setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))
          }
          style={{ opacity: currentStepIndex === steps.length - 1 ? 0.4 : 1 }}
        >
          次の工程 (→) ▶
        </button>
      </div>
    </div>
  );
}
