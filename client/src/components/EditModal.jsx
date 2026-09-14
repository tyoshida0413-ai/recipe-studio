import React, { useState, useEffect } from 'react';

export default function EditModal({ isOpen, onClose, recipe, onSave }) {
  const [title, setTitle] = useState('');
  const [cookingTime, setCookingTime] = useState('15分');
  const [baseServings, setBaseServings] = useState(1);
  const [groupKey, setGroupKey] = useState('pasta');
  const [groupName, setGroupName] = useState('🍝 パスタ系');
  const [coverImage, setCoverImage] = useState('');
  const [myArrangement, setMyArrangement] = useState('');

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title || '');
      setCookingTime(recipe.cookingTime || '15分');
      setBaseServings(recipe.baseServings || 1);
      setGroupKey(recipe.groupKey || 'pasta');
      setGroupName(recipe.groupName || '🍝 パスタ系');
      setCoverImage(recipe.coverImage || '');
      setMyArrangement(recipe.myArrangement || '');
    }
  }, [recipe]);

  if (!isOpen || !recipe) return null;

  const handleGroupChange = (e) => {
    const key = e.target.value;
    setGroupKey(key);
    if (key === 'pasta') setGroupName('🍝 パスタ系');
    else if (key === 'nabe') setGroupName('🍲 鍋・汁物系');
    else if (key === 'rice') setGroupName('🍚 ご飯・肉系');
    else setGroupName('🥗 その他');
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('料理名を入力してください');
      return;
    }
    onSave(recipe.id, {
      title: title.trim(),
      cookingTime: cookingTime.trim(),
      baseServings: Number(baseServings) || 1,
      groupKey,
      groupName,
      coverImage: coverImage.trim(),
      myArrangement: myArrangement.trim(),
    });
    onClose();
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: '540px' }}>
        <div className="modal-header">
          <div className="modal-title">✏️ レシピの編集・味の調整</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">料理名</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 至高のペペロンチーノ"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">グループ分類</label>
              <select
                className="form-select"
                value={groupKey}
                onChange={handleGroupChange}
              >
                <option value="pasta">🍝 パスタ系</option>
                <option value="nabe">🍲 鍋・汁物系</option>
                <option value="rice">🍚 ご飯・肉系</option>
                <option value="other">🥗 その他</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">調理目安時間</label>
              <input
                type="text"
                className="form-input"
                value={cookingTime}
                onChange={(e) => setCookingTime(e.target.value)}
                placeholder="例: 15分"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">基本分量（人数）</label>
            <input
              type="number"
              min="1"
              max="20"
              className="form-input"
              value={baseServings}
              onChange={(e) => setBaseServings(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">料理の画像URL（任意）</label>
            <input
              type="text"
              className="form-input"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">⭐️ マイアレンジ・味の調整メモ（あなた専用）</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={myArrangement}
              onChange={(e) => setMyArrangement(e.target.value)}
              placeholder="自分好みの味付けや、家族の好みに合わせた調整メモを記録..."
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            変更を保存
          </button>
        </div>
      </div>
    </div>
  );
}
