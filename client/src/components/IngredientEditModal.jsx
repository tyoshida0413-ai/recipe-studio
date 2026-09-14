import React, { useState, useEffect } from 'react';

export default function IngredientEditModal({ isOpen, onClose, recipe, onSave }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (recipe && recipe.ingredients) {
      setRows(
        recipe.ingredients.map((ing) => ({
          name: ing.name || '',
          amount: ing.amount || (ing.baseAmount ? `${ing.baseAmount}${ing.unit || ''}` : ''),
        }))
      );
    }
  }, [recipe]);

  if (!isOpen || !recipe) return null;

  const handleRowChange = (index, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, { name: '', amount: '' }]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const validRows = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        amount: r.amount.trim(),
        baseAmount: parseFloat(r.amount) || null,
        unit: r.amount.replace(/[0-9.]/g, '').trim(),
      }));

    onSave(recipe.id, { ingredients: validRows });
    onClose();
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: '560px' }}>
        <div className="modal-header">
          <div className="modal-title">🥕 材料・調味料の編集</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            食材名と分量を直接編集できます。人数計算に対応させたい場合は「100g」「2本」のように数値を先頭に記述してください。
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
            {rows.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="食材・調味料名 (例: にんにく)"
                  style={{ flex: 2, padding: '7px 10px', fontSize: '0.85rem' }}
                  value={row.name}
                  onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="分量 (例: 2片)"
                  style={{ flex: 1, padding: '7px 10px', fontSize: '0.85rem' }}
                  value={row.amount}
                  onChange={(e) => handleRowChange(idx, 'amount', e.target.value)}
                />
                <button
                  className="btn btn-secondary btn-small"
                  style={{ color: '#dc2626', borderColor: '#fee2e2', padding: '6px 9px' }}
                  onClick={() => handleRemoveRow(idx)}
                  title="削除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            className="btn btn-secondary"
            style={{ marginTop: '12px', width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}
            onClick={handleAddRow}
          >
            ＋ 材料行を追加
          </button>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
