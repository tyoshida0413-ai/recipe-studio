import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import RecipeDetail from './components/RecipeDetail.jsx';
import CookingMode from './components/CookingMode.jsx';
import ImportModal from './components/ImportModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ShoppingListModal from './components/ShoppingListModal.jsx';
import IngredientEditModal from './components/IngredientEditModal.jsx';
import { useRecipes } from './hooks/useRecipes.js';
import { useSettings } from './hooks/useSettings.js';

export default function App() {
  const {
    recipes,
    groups,
    currentRecipe,
    filters,
    setFilters,
    selectRecipe,
    updateRecipe,
    toggleFavorite,
    removeRecipe,
    addRecipe,
  } = useRecipes();

  const { settings, hasApiKey, updateSettings } = useSettings();

  // モーダル表示状態
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isIngredientEditOpen, setIsIngredientEditOpen] = useState(false);
  const [isCookingModeOpen, setIsCookingModeOpen] = useState(false);

  // 初回ロード時に1件目のレシピを選択
  useEffect(() => {
    if (!currentRecipe && recipes.length > 0) {
      selectRecipe(recipes[0]);
    }
  }, [recipes, currentRecipe, selectRecipe]);

  // 検索フィルター
  const handleSearchChange = (term) => {
    setFilters((prev) => ({ ...prev, search: term }));
  };

  // グループ選択
  const handleSelectGroup = (groupKey) => {
    setFilters((prev) => ({ ...prev, group: groupKey, favorite: false }));
  };

  // お気に入りフィルター
  const handleToggleFavoriteFilter = () => {
    setFilters((prev) => ({ ...prev, favorite: !prev.favorite }));
  };

  // グループ追加
  const handleAddGroup = (groupName) => {
    const key = `grp_${Date.now()}`;
    // グループ追加処理
    if (currentRecipe) {
      updateRecipe(currentRecipe.id, { groupKey: key, groupName });
    }
  };

  return (
    <>
      {/* ヘッダー */}
      <Header
        searchTerm={filters.search || ''}
        onSearchChange={handleSearchChange}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShoppingList={() => setIsShoppingListOpen(true)}
        hasApiKey={hasApiKey}
      />

      {/* メインレイアウト */}
      <div className="main-container">
        <Sidebar
          recipes={recipes}
          groups={groups}
          currentRecipe={currentRecipe}
          selectedGroup={filters.group || 'all'}
          isFavoriteFilter={!!filters.favorite}
          onSelectGroup={handleSelectGroup}
          onToggleFavoriteFilter={handleToggleFavoriteFilter}
          onSelectRecipe={selectRecipe}
          onToggleFavorite={toggleFavorite}
          onAddGroup={handleAddGroup}
        />

        <RecipeDetail
          recipe={currentRecipe}
          onToggleFavorite={toggleFavorite}
          onOpenCookingMode={() => setIsCookingModeOpen(true)}
          onOpenShoppingList={() => setIsShoppingListOpen(true)}
          onOpenIngredientEdit={() => setIsIngredientEditOpen(true)}
          onUpdateRecipe={updateRecipe}
          onDeleteRecipe={removeRecipe}
        />
      </div>

      {/* フルスクリーン 調理モード */}
      {isCookingModeOpen && currentRecipe && (
        <CookingMode
          recipe={currentRecipe}
          onClose={() => setIsCookingModeOpen(false)}
        />
      )}

      {/* レシピ取り込み・AI作成モーダル */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onRecipeCreated={(recipe) => {
          addRecipe(recipe);
          selectRecipe(recipe);
        }}
      />

      {/* 設定モーダル */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        hasApiKey={hasApiKey}
        onSaveSettings={updateSettings}
      />

      {/* 買い物リストモーダル */}
      <ShoppingListModal
        isOpen={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
        recipe={currentRecipe}
      />

      {/* 材料編集モーダル */}
      <IngredientEditModal
        isOpen={isIngredientEditOpen}
        onClose={() => setIsIngredientEditOpen(false)}
        recipe={currentRecipe}
        onSave={updateRecipe}
      />
    </>
  );
}
