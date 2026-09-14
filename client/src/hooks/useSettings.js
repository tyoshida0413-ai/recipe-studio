import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../api/client.js';

const STORAGE_KEY = 'recipe_ai_settings';

export function useSettings() {
  const [settings, setSettings] = useState({});
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 設定のロード（サーバー優先、無ければLocalStorage）
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. ローカルストレージから即時読み込み（高速化・オフライン対応）
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

      // 2. サーバーAPIがあるか試行
      try {
        const data = await settingsApi.get();
        const status = await settingsApi.getStatus();
        const merged = { ...local, ...data };
        setSettings(merged);
        setHasApiKey(status.hasOpenAiKey || !!merged.gemini_api_key || !!merged.openai_api_key);
        return;
      } catch (serverErr) {
        // 静的ホスティング（GitHub Pages）時はLocalStorageを正とする
        setSettings(local);
        setHasApiKey(!!local.gemini_api_key || !!local.openai_api_key);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 設定の保存（LocalStorage + サーバーAPI）
  const updateSettings = useCallback(async (newSettings) => {
    try {
      // ローカルストレージに保存
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const updated = { ...current, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSettings(updated);
      setHasApiKey(!!updated.gemini_api_key || !!updated.openai_api_key);

      // サーバーAPIへも可能なら送信
      try {
        await settingsApi.update(newSettings);
      } catch (e) {
        // GitHub Pages等でサーバーがない場合は無視
      }

      return { settings: updated };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    settings,
    hasApiKey,
    loading,
    error,
    fetchSettings,
    updateSettings,
  };
}
