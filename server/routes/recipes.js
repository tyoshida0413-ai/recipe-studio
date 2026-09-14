import { Router } from 'express';
import { getAllRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe, toggleFavorite, getAllGroups } from '../db/database.js';

const router = Router();

// レシピ一覧取得
router.get('/', (req, res) => {
  try {
    const filters = {
      group: req.query.group || null,
      favorite: req.query.favorite === 'true',
      search: req.query.search || null,
    };
    const recipes = getAllRecipes(filters);
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// グループ一覧取得
router.get('/groups', (req, res) => {
  try {
    const groups = getAllGroups();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// レシピ詳細取得
router.get('/:id', (req, res) => {
  try {
    const recipe = getRecipeById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'レシピが見つかりません' });
    }
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// レシピ新規作成
router.post('/', (req, res) => {
  try {
    const recipe = createRecipe(req.body);
    res.status(201).json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// レシピ更新
router.put('/:id', (req, res) => {
  try {
    const recipe = updateRecipe(req.params.id, req.body);
    if (!recipe) {
      return res.status(404).json({ error: 'レシピが見つかりません' });
    }
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// レシピ削除
router.delete('/:id', (req, res) => {
  try {
    deleteRecipe(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// お気に入りトグル
router.patch('/:id/favorite', (req, res) => {
  try {
    const recipe = toggleFavorite(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'レシピが見つかりません' });
    }
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
