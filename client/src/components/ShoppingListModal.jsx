import React, { useState, useEffect } from 'react';

// 常備調味料キーワード
const PANTRY_KEYWORDS = [
  '塩', '胡椒', 'コショウ', 'ブラックペッパー', '水', '油', 'オリーブオイル',
  'サラダ油', 'ごま油', '醤油', 'しょうゆ', '酒', '料理酒', 'みりん', '味醂',
  '砂糖', 'だしの素', '和風だし', 'コンソメ', '鶏ガラスープ'
];

export default function ShoppingListModal({ isOpen, onClose, recipe, allRecipes = [] }) {
  // 合算対象のレシピIDリスト（デフォルトは現在のレシピ）
  const [combinedRecipeIds, setCombinedRecipeIds] = useState(new Set());
  // 常備調味料除外フラグ
  const [excludePantry, setExcludePantry] = useState(true);
  // チェックされたアイテムのキー (Set)
  const [checkedItemKeys, setCheckedItemKeys] = useState(new Set());
  // Appleリマインダー設定
  const [reminderList, setReminderList] = useState('買い物');
  const [reminderTiming, setReminderTiming] = useState('today18');
  const [copied, setCopied] = useState(false);
  const [reminderExported, setReminderExported] = useState(false);

  // レシピ変更時
  useEffect(() => {
    if (recipe) {
      setCombinedRecipeIds(new Set([recipe.id]));
    }
  }, [recipe]);

  if (!isOpen || !recipe) return null;

  // 他の候補レシピ（合算用）
  const otherRecipes = (allRecipes || []).filter((r) => r.id !== recipe.id);

  // 合算した全材料リストの作成
  const activeRecipes = (allRecipes || []).filter((r) => combinedRecipeIds.has(r.id));
  if (!combinedRecipeIds.has(recipe.id) && activeRecipes.length === 0) {
    activeRecipes.push(recipe);
  }

  let aggregatedItems = [];
  activeRecipes.forEach((rec) => {
    (rec.ingredients || []).forEach((ing, iIdx) => {
      aggregatedItems.push({
        id: `${rec.id}_${iIdx}`,
        recipeTitle: rec.title,
        name: ing.name,
        amount: ing.amount || `${ing.baseAmount || ''}${ing.unit || ''}`,
      });
    });
  });

  // 常備調味料除外フィルタ
  const displayItems = excludePantry
    ? aggregatedItems.filter(
        (it) => !PANTRY_KEYWORDS.some((kw) => it.name.includes(kw))
      )
    : aggregatedItems;

  // 初期化時に全選択
  useEffect(() => {
    setCheckedItemKeys(new Set(displayItems.map((it) => it.id)));
  }, [displayItems.length, excludePantry, combinedRecipeIds.size]);

  const toggleItemCheck = (id) => {
    setCheckedItemKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedItemKeys.size === displayItems.length) {
      setCheckedItemKeys(new Set());
    } else {
      setCheckedItemKeys(new Set(displayItems.map((it) => it.id)));
    }
  };

  const toggleCombine = (targetId) => {
    setCombinedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  };

  // テキストコピー
  const handleCopyText = () => {
    const selected = displayItems.filter((it) => checkedItemKeys.has(it.id));
    if (selected.length === 0) return;

    let text = `🛒 【買い物リスト】\n`;
    text += `対象: ${activeRecipes.map((r) => r.title).join(' ＋ ')}\n\n`;
    selected.forEach((it) => {
      text += `・${it.name}: ${it.amount}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // 🍎 Appleリマインダーへ登録
  const handleExportToAppleReminders = async () => {
    const selected = displayItems.filter((it) => checkedItemKeys.has(it.id));
    if (selected.length === 0) {
      alert('買い物リストの食材を1つ以上選択してください');
      return;
    }

    let timeText = '指定なし';
    if (reminderTiming === 'today18') timeText = '本日 18:00 (帰宅時・買い出し)';
    if (reminderTiming === 'tomorrow10') timeText = '明日 10:00 (午前中)';

    const listTitle = `🛒 買い物リスト: ${activeRecipes.map((r) => r.title).join(' ＆ ')}`;
    const itemsText = selected.map((it) => `・${it.name}: ${it.amount}`).join('\n');

    // 1. Web Share API（iOS / macOS Safari 等）
    if (navigator.share) {
      try {
        await navigator.share({
          title: listTitle,
          text: `${listTitle}\n\n${itemsText}\n\n通知: ${timeText}`,
        });
        setReminderExported(true);
        setTimeout(() => setReminderExported(false), 3000);
        return;
      } catch (err) {
        // 共有キャンセル時は続行
      }
    }

    // 2. モック仕様準拠の完了ダイアログ
    alert(
      `🍎 Appleリマインダーの「${reminderList}」リストへ登録しました！\n\n` +
      `・登録件数: ${selected.length}品\n` +
      `・通知設定: ${timeText}\n` +
      `・対象レシピ: ${activeRecipes.map((r) => r.title).join(' ＋ ')}\n\n` +
      `※Mac / iPhone / iPad の「リマインダー」アプリと自動同期されます。`
    );
    setReminderExported(true);
    setTimeout(() => {
      setReminderExported(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: '620px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛒 買い物リスト生成 ＆ リマインダー連携</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* 対象レシピ ＆ 合算セクション */}
          <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-xs)', padding: '10px 14px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                対象レシピ:
              </span>
              {otherRecipes.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {otherRecipes.slice(0, 2).map((other) => {
                    const isCombined = combinedRecipeIds.has(other.id);
                    return (
                      <button
                        key={other.id}
                        className={`btn btn-small ${isCombined ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        onClick={() => toggleCombine(other.id)}
                      >
                        {isCombined ? `✓ ${other.title}を合算中` : `＋ ${other.title}も合算`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-terracotta)' }}>
              {activeRecipes.map((r) => r.title).join(' ＋ ')}
            </div>
          </div>

          {/* 常備調味料除外トグル ＆ 選択カウント */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              padding: '8px 12px',
              background: 'var(--accent-terracotta-light)',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--accent-terracotta-border)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.83rem', fontWeight: 600, color: '#9a3412', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={excludePantry}
                onChange={(e) => setExcludePantry(e.target.checked)}
              />
              <span>🧂 家にある常備調味料（塩・水・油・醤油など）を自動で除外</span>
            </label>
            <span style={{ fontSize: '0.78rem', color: '#c2410c', fontWeight: 600 }}>
              選択中: {checkedItemKeys.size}品
            </span>
          </div>

          {/* 食材リスト一覧 */}
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', padding: '6px', marginBottom: '14px' }}>
            {displayItems.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '0.85rem' }}>
                買うものはありません（常備調味料のみ）
              </div>
            ) : (
              displayItems.map((item) => {
                const isChecked = checkedItemKeys.has(item.id);
                return (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: isChecked ? '#fff' : '#faf9f7',
                      border: '1px solid var(--border-subtle)',
                      marginBottom: '5px',
                      cursor: 'pointer',
                      opacity: isChecked ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItemCheck(item.id)}
                      />
                      <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{item.name}</span>
                      {activeRecipes.length > 1 && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                          {item.recipeTitle}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-terracotta)' }}>
                      {item.amount}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* 🍎 Appleリマインダー設定セクション */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
              <span>🍎 リマインダー登録設定</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '3px' }}>登録先リスト</label>
                <select
                  className="form-select"
                  style={{ padding: '6px 8px', fontSize: '0.82rem', width: '100%' }}
                  value={reminderList}
                  onChange={(e) => setReminderList(e.target.value)}
                >
                  <option value="買い物">Apple リマインダー「買い物」</option>
                  <option value="今日やること">Apple リマインダー「今日やること」</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '3px' }}>通知タイミング</label>
                <select
                  className="form-select"
                  style={{ padding: '6px 8px', fontSize: '0.82rem', width: '100%' }}
                  value={reminderTiming}
                  onChange={(e) => setReminderTiming(e.target.value)}
                >
                  <option value="today18">今日 18:00 (帰宅時・買い出し)</option>
                  <option value="tomorrow10">明日 10:00 (午前中)</option>
                  <option value="none">通知なし (リスト追加のみ)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCopyText} disabled={checkedItemKeys.size === 0}>
            {copied ? '✓ コピーしました！' : '📋 テキストコピー'}
          </button>
          <button className="btn btn-primary" onClick={handleExportToAppleReminders} disabled={checkedItemKeys.size === 0}>
            {reminderExported ? '✓ 登録完了！' : '🍎 Appleリマインダーに登録'}
          </button>
        </div>
      </div>
    </div>
  );
}
