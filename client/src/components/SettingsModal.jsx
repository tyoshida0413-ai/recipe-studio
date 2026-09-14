import React, { useState, useEffect } from 'react';
import { supabaseSync } from '../api/supabaseSync.js';

export default function SettingsModal({ isOpen, onClose, settings, hasApiKey, onSaveSettings }) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');

  // Supabase 同期設定
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [syncKey, setSyncKey] = useState('');
  const [testStatus, setTestStatus] = useState(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (settings) {
      setModel(settings.openai_model || 'gpt-4o');
      setSupabaseUrl(settings.supabase_url || '');
      setSupabaseAnonKey(settings.supabase_anon_key || '');
      setSyncKey(settings.sync_key || '');
    }
  }, [settings]);

  if (!isOpen) return null;

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
        openai_model: model,
        supabase_url: supabaseUrl.trim(),
        supabase_anon_key: supabaseAnonKey.trim(),
        sync_key: syncKey.trim(),
      };
      if (apiKey.trim()) {
        payload.openai_api_key = apiKey.trim();
      }
      await onSaveSettings(payload);
      setMessage({ type: 'success', text: '設定を保存しました。データ同期が有効になりました。' });
      setApiKey('');
      setTimeout(() => {
        onClose();
        setMessage(null);
        setTestStatus(null);
        // 設定反映のためにリロード
        window.location.reload();
      }, 1200);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || '保存に失敗しました。' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: '580px' }}>
        <div className="modal-header">
          <div className="modal-title">⚙️ API設定 ＆ Mac・iPad同期</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* OpenAI API Key */}
          <div className="form-group">
            <label className="form-label">
              OpenAI API キー
              {hasApiKey && (
                <span style={{ color: '#16a34a', fontSize: '0.78rem', marginLeft: '8px' }}>
                  ✓ 設定済み
                </span>
              )}
            </label>
            <input
              type="password"
              className="form-input"
              placeholder={hasApiKey ? '変更する場合のみ入力 (sk-...)' : 'sk-...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              YouTubeやテキストのレシピAI自動解析に使用します。
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />

          {/* Supabase 同期キー設定 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1rem' }}>☁️</span>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Mac・iPad リアルタイム同期（Supabase）</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              MacとiPadに**同じ同期キー**を入力すると、登録・編集したレシピが自動的にクラウド同期されます。
            </div>
          </div>

          {/* 同期キー（合言葉） */}
          <div className="form-group">
            <label className="form-label">
              🔑 同期キー（任意の合言葉 / パスコード）
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="例: my-family-kitchen-2026"
              value={syncKey}
              onChange={(e) => setSyncKey(e.target.value)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              ※ MacとiPadの両方に同じ文字列を入力してください。
            </div>
          </div>

          {/* Supabase Project URL */}
          <div className="form-group">
            <label className="form-label">Supabase Project URL</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
          </div>

          {/* Supabase Anon Key */}
          <div className="form-group">
            <label className="form-label">Supabase Anon Key（公開キー）</label>
            <input
              type="password"
              className="form-input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
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
            {saving ? '保存中...' : '設定を保存して同期開始'}
          </button>
        </div>
      </div>
    </div>
  );
}
