import React from 'react';

export default function Header({
  searchTerm,
  onSearchChange,
  onOpenImport,
  onOpenSettings,
  onOpenShoppingList,
  hasApiKey,
}) {
  return (
    <header>
      <div className="brand">
        <div className="brand-icon">🍳</div>
        <span>RecipeAI Studio</span>
      </div>

      <div className="header-actions">
        <div className="search-box">
          <span>🔍</span>
          <input
            type="text"
            placeholder="料理名・食材・グループで検索..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <button
          className="btn btn-secondary"
          onClick={onOpenShoppingList}
          title="選択中レシピの食材から買い物リストを生成"
        >
          🛒 買い物リスト
        </button>

        <button
          className="btn btn-secondary"
          onClick={onOpenSettings}
          title="OpenAI APIキー等の設定"
          style={{ position: 'relative' }}
        >
          ⚙️ API設定
          {!hasApiKey && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ef4444',
              }}
              title="APIキーが未設定です"
            />
          )}
        </button>

        <button className="btn btn-primary" onClick={onOpenImport}>
          ✨ レシピを取り込む / 作成
        </button>
      </div>
    </header>
  );
}
