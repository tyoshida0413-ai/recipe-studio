import React, { useState, useEffect } from 'react';
import { supabaseSync } from '../api/supabaseSync.js';

export default function SettingsModal({ isOpen, onClose, settings, hasApiKey, onSaveSettings }) {
  // Gemini API Key
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');

  // OpenAI API Key
  const [openaiApiKey, setOpenaiApiKey] = useState('');

  // Supabase 同期設定
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [syncKey, setSyncKey] = useState('');
  const [testStatus, setTestStatus] = useState(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (settings) {
      setGeminiModel(settings.gemini_model || 'gemini-2.0-flash');
      setSupabaseUrl(settings.supabase_url || '');
      setSupabaseAnonKey(settings.supabase_anon_key || '');
      setSyncKey(settings.sync_key || '');
    }
  }, [settings]);

  if (!isOpen) return null;

  const hasGeminiKey = !!settings?.gemini_api_key;
  const hasOpenaiKey = !!settings?.openai_api_key;

  const handleTestSupabase = async () => {
    setTestStatus('testing');
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL と Anon Key を入力してください');
      }
      await supabaseSync.testConnection(supabaseUrl, supabaseAnonKey);
      setTestStatus('ok');
    } catch (err) {
      setTestStatus('error');
      setMessage({ type: 'error', text: `Supabase接続テスト失敗: ${err.message}` });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        gemini_model: geminiModel,
        supabase_url: supabaseUrl.trim(),
        supabase_anon_key: supabaseAnonKey.trim(),
        sync_key: syncKey.trim(),
      };
      if (geminiApiKey.trim()) {
        payload.gemini_api_key = geminiApiKey.trim();
      }
      if (openaiApiKey.trim()) {
        payload.openai_api_key = openaiApiKey.trim();
      }

      await onSaveSettings(payload);
      setMessage({ type: 'success', text: '設定を保存しました。' });
      setGeminiApiKey('');
      setOpenaiApiKey('');
      setTimeout(() => {
        onClose();
        setMessage(null);
        setTestStatus(null);
        window.location.reload();
      }, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || '保存に失敗しました。' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: '600px' }}>
        <div className="modal-header">
          <div className="modal-title">⚙️ AI設定 ＆ Mac・iPad同期</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Google Gemini API Key */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.1rem' }}>✨</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Google Gemini API 設定（推奨）</span>
              {hasGeminiKey && (
                <span style={{ color: '#16a34a', fontSize: '0.78rem', fontWeight: 600, marginLeft: 'auto' }}>
                  ✓ 設定済み
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Google AI Studio（aistudio.google.com）で取得した API キー（AIzaSy...）を登録します。
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <input
                type="password"
                className="form-input"
                placeholder={hasGeminiKey ? '変更する場合のみ入力 (AIzaSy...)' : 'AIzaSy...'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '4px' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Gemini モデル選択</label>
              <select
                className="form-select"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash（超高速・高精度・推奨）</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash（軽量高速）</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro（最高精度）</option>
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />

          {/* Supabase 同期キー設定 */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.1rem' }}>☁️</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Mac・iPad リアルタイム同期（Supabase）</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '8px' }}>
              MacとiPadに**同じ同期キー**を入力すると、登録・編集したレシピが自動的にクラウド同期されます。
            </div>

            {/* 同期キー（合言葉） */}
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                🔑 同期キー（任意の合言葉 / パスコード）
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="例: my-family-kitchen-2026"
                value={syncKey}
                onChange={(e) => setSyncKey(e.target.value)}
              />
            </div>

            {/* Supabase Project URL */}
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>Supabase Project URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>

            {/* Supabase Anon Key */}
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>Supabase Anon Key（公開キー）</label>
              <input
                type="password"
                className="form-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleTestSupabase}
                disabled={!supabaseUrl || !supabaseAnonKey}
              >
                🔄 接続テスト
              </button>
              {testStatus === 'testing' && <span style={{ fontSize: '0.8rem' }}>接続確認中...</span>}
              {testStatus === 'ok' && <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>✓ 接続成功！</span>}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />

          {/* OpenAI API Key（任意・代替） */}
          <details style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '6px' }}>
              OpenAI API を使用する場合（オプション）
              {hasOpenaiKey && <span style={{ color: '#16a34a', marginLeft: '6px' }}>✓ 設定済み</span>}
            </summary>
            <div className="form-group" style={{ marginTop: '8px' }}>
              <input
                type="password"
                className="form-input"
                placeholder={hasOpenaiKey ? '変更する場合のみ入力 (sk-...)' : 'sk-...'}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
              />
            </div>
          </details>

          {message && (
            <div
              style={{
                marginTop: '14px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.85rem',
                background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: message.type === 'success' ? '#16a34a' : '#dc2626',
                border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fee2e2'}`,
              }}
            >
              {message.text}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            閉じる
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
