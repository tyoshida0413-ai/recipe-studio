import React, { useState, useEffect } from 'react';

export default function ShoppingListModal({ isOpen, onClose, recipe }) {
  const [items, setItems] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (recipe && recipe.ingredients) {
      setItems(recipe.ingredients);
      // デフォルトで全選択
      setSelectedIndices(new Set(recipe.ingredients.map((_, i) => i)));
    }
  }, [recipe]);

  if (!isOpen || !recipe) return null;

  const toggleItem = (idx) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIndices.size === items.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(items.map((_, i) => i)));
    }
  };

  const handleCopy = () => {
    const selectedItems = items.filter((_, i) => selectedIndices.has(i));
    const text = `【買い物リスト - ${recipe.title}】\n` +
      selectedItems.map((item) => `・${item.name} (${item.amount || `${item.baseAmount || ''}${item.unit || ''}`})`).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: '580px' }}>
        <div className="modal-header">
          <div className="modal-title">🛒 買い物リスト生成</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-xs)', padding: '10px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              対象レシピ:
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-terracotta)' }}>
              {recipe.title}
            </div>
          </div>

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
                checked={selectedIndices.size === items.length && items.length > 0}
                onChange={toggleAll}
              />
              <span>すべて選択 / 解除</span>
            </label>
            <span style={{ fontSize: '0.78rem', color: '#c2410c', fontWeight: 600 }}>
              選択中: {selectedIndices.size}品
            </span>
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', padding: '6px', marginBottom: '16px' }}>
            {items.map((item, idx) => {
              const isSelected = selectedIndices.has(idx);
              const displayAmount = item.amount || `${item.baseAmount || ''}${item.unit || ''}`;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-xs)',
                    background: isSelected ? '#fff' : 'transparent',
                    borderBottom: '1px solid #f3f1ec',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(idx)}
                    />
                    <span>{item.name}</span>
                  </label>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-main)' }}>
                    {displayAmount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            閉じる
          </button>
          <button className="btn btn-primary" onClick={handleCopy} disabled={selectedIndices.size === 0}>
            {copied ? '✓ コピーしました！' : '📋 リストをクリップボードにコピー'}
          </button>
        </div>
      </div>
    </div>
  );
}
