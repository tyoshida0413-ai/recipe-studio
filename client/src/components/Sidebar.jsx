import React from 'react';

export default function Sidebar({
  recipes,
  groups,
  currentRecipe,
  selectedGroup,
  isFavoriteFilter,
  onSelectGroup,
  onToggleFavoriteFilter,
  onSelectRecipe,
  onToggleFavorite,
  onAddGroup,
}) {
  const totalCount = recipes.length;
  const favCount = recipes.filter((r) => r.isFavorite).length;

  const handleAddGroupPrompt = () => {
    const name = window.prompt('新しいグループ（フォルダ）名を入力してください:');
    if (name && name.trim()) {
      onAddGroup(name.trim());
    }
  };

  return (
    <aside className="sidebar">
      {/* グループ分類フィルター */}
      <div className="group-filter-wrapper">
        <div className="group-header">
          <span className="group-label">📁 フォルダ・グループ</span>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--accent-terracotta)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={handleAddGroupPrompt}
          >
            ＋ 追加
          </span>
        </div>
        <div className="group-chips">
          <button
            className={`group-chip ${selectedGroup === 'all' && !isFavoriteFilter ? 'active' : ''}`}
            onClick={() => onSelectGroup('all')}
          >
            すべて ({totalCount})
          </button>
          <button
            className={`group-chip fav-chip ${isFavoriteFilter ? 'active' : ''}`}
            onClick={onToggleFavoriteFilter}
            style={{ borderColor: '#fde047', background: isFavoriteFilter ? '#fef08a' : '#fefce8', color: '#b45309' }}
          >
            ⭐️ お気に入り ({favCount})
          </button>
          {groups.map((g) => (
            <button
              key={g.key}
              className={`group-chip ${selectedGroup === g.key && !isFavoriteFilter ? 'active' : ''}`}
              onClick={() => onSelectGroup(g.key)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* レシピ一覧リスト */}
      <div className="recipe-list">
        {recipes.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 10px', fontSize: '0.85rem' }}>
            該当するレシピはありません。
            <br />
            「★」を押して登録するか、新しく取り込んでください。
          </div>
        ) : (
          recipes.map((recipe) => {
            const isSelected = currentRecipe?.id === recipe.id;
            return (
              <div
                key={recipe.id}
                className={`recipe-card ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectRecipe(recipe)}
              >
                <img
                  src={recipe.coverImage || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&q=80'}
                  alt={recipe.title}
                  className="card-thumb"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&q=80';
                  }}
                />
                <div className="card-info">
                  <div className="card-top">
                    <span
                      className={`badge badge-${recipe.sourceType || 'yt'}`}
                      style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                    >
                      {recipe.sourceBadge || 'レシピ'}
                    </span>
                    <span
                      className={`card-fav-star ${recipe.isFavorite ? 'active' : ''}`}
                      title={recipe.isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(recipe.id);
                      }}
                    >
                      {recipe.isFavorite ? '★' : '☆'}
                    </span>
                  </div>
                  <div className="card-title">{recipe.title}</div>
                  <div className="card-meta">
                    <span>⏱ {recipe.cookingTime || '15分'}</span>
                    <span>•</span>
                    <span>{recipe.groupName || '未分類'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
