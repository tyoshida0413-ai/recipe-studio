import React, { useState, useEffect } from 'react';
import { supabaseSync } from '../api/supabaseSync.js';
import { testGeminiConnection } from '../api/gemini.js';

// Google AI 公式ドキュメント準拠の最新Geminiモデル一覧
const GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash（Google公式 最新フラッグシップ・超高速・推奨）', badge: '最新' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash（高推論・マルチステップ実行）' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash（標準・高信頼ワークロード）' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite（最速・超低レイテンシ）' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview（最高峰推論・複雑なレシピ解析）' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash（第2.5世代標準）' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro（第2.5世代高精度推論）' },
  { id: 'custom', name: '＋ その他のモデル名を手動入力...' },
];

export default function SettingsModal({ isOpen, onClose, settings, hasApiKey, onSaveSettings }) {
  // Gemini API Key
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  const [customModelName, setCustomModelName] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiTestStatus, setGeminiTestStatus] = useState(null); // 'testing' | 'ok' | 'error'
  const [geminiTestError, setGeminiTestError] = useState('');

  // OpenAI API Key
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);

  // Supabase 同期設定
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [syncKey, setSyncKey] = useState('');
  const [testStatus, setTestStatus] = useState(null);

  // iPad連携用
  const [showTransferQR, setShowTransferQR] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (settings) {
      if (settings.gemini_api_key) {
        setGeminiApiKey(settings.gemini_api_key);
      }
      if (settings.openai_api_key) {
        setOpenaiApiKey(settings.openai_api_key);
      }
      const model = settings.gemini_model || 'gemini-3.8-flash';
      const isPredefined = GEMINI_MODELS.some(m => m.id === model);
      if (isPredefined) {
        setGeminiModel(model);
      } else {
        setGeminiModel('custom');
        setCustomModelName(model);
      }
      setSupabaseUrl(settings.supabase_url || '');
      setSupabaseAnonKey(settings.supabase_anon_key || '');
      setSyncKey(settings.sync_key || '');
    }
  }, [settings]);

  if (!isOpen) return null;

  const effectiveGeminiModel = geminiModel === 'custom' ? (customModelName.trim() || 'gemini-3.8-flash') : geminiModel;
  const hasGeminiKey = !!geminiApiKey.trim() || !!settings?.gemini_api_key;
  const hasOpenaiKey = !!openaiApiKey.trim() || !!settings?.openai_api_key;

  // Gemini 接続テスト
  const handleTestGemini = async () => {
    setGeminiTestStatus('testing');
    setGeminiTestError('');
    try {
      const keyToTest = geminiApiKey.trim() || settings?.gemini_api_key;
      if (!keyToTest) {
        throw new Error('Gemini API キーを入力してください');
      }
      await testGeminiConnection(keyToTest, effectiveGeminiModel);
      setGeminiTestStatus('ok');
    } catch (err) {
      setGeminiTestStatus('error');
      setGeminiTestError(err.message || '接続に失敗しました');
    }
  };

  // Supabase 接続テスト
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
  // iPad引き継ぎURL生成
  const getTransferUrl = () => {
    const config = {
      gemini_api_key: geminiApiKey.trim() || settings?.gemini_api_key || '',
      gemini_model: effectiveGeminiModel,
      supabase_url: supabaseUrl.trim() || settings?.supabase_url || '',
      supabase_anon_key: supabaseAnonKey.trim() || settings?.supabase_anon_key || '',
      sync_key: syncKey.trim() || settings?.sync_key || '',
    };
    if (openaiApiKey.trim() || settings?.openai_api_key) {
      config.openai_api_key = openaiApiKey.trim() || settings?.openai_api_key;
    }
    const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#setup=${base64}`;
  };

  const handleCopyLink = () => {
    const url = getTransferUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        gemini_model: effectiveGeminiModel,
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
      setTimeout(() => {
        onClose();
        setMessage(null);
        setTestStatus(null);
        setGeminiTestStatus(null);
        window.location.reload();
      }, 800);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || '保存に失敗しました。' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: '620px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div className="modal-title">⚙️ AI設定 ＆ Mac・iPad同期</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
          {/* Google Gemini API 設定 */}
          <div style={{ marginBottom: '16px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>✨</span>
              <span style={{ fontWeight: 700, fontSize: '0.96rem' }}>Google Gemini API 設定（最新・推奨）</span>
              {hasGeminiKey && (
                <span style={{ color: '#16a34a', fontSize: '0.78rem', fontWeight: 700, marginLeft: 'auto', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                  ✓ 設定済み
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
              Google AI Studio（<a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>aistudio.google.com</a>）で取得した API キー（AIzaSy...）を登録します。
            </div>

            {/* APIキー入力欄 */}
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Gemini API キー</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ブラウザ内に安全に保存されます</span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  className="form-input"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => {
                    setGeminiApiKey(e.target.value);
                    setGeminiTestStatus(null);
                  }}
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.88rem' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0 10px', fontSize: '0.9rem' }}
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  title={showGeminiKey ? 'キーを隠す' : 'キーを表示する'}
                >
                  {showGeminiKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Gemini モデル選択 */}
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Gemini モデル選択（Web公式最新）
              </label>
              <select
                className="form-select"
                style={{ padding: '8px 10px', fontSize: '0.88rem', fontWeight: 500 }}
                value={geminiModel}
                onChange={(e) => {
                  setGeminiModel(e.target.value);
                  setGeminiTestStatus(null);
                }}
              >
                {GEMINI_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* カスタムモデル名入力 */}
            {geminiModel === 'custom' && (
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  手動入力するモデル名（例: gemini-3.8-flash, gemini-3.5-pro 等）
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="gemini-3.8-flash"
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              </div>
            )}

            {/* 接続テストボタン */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleTestGemini}
                disabled={(!geminiApiKey && !settings?.gemini_api_key) || geminiTestStatus === 'testing'}
                style={{ fontSize: '0.8rem' }}
              >
                {geminiTestStatus === 'testing' ? '⏳ 通信確認中...' : '⚡️ Gemini 接続テスト'}
              </button>
              {geminiTestStatus === 'ok' && (
                <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                  ✓ 接続成功！（モデル: {effectiveGeminiModel} 応答OK）
                </span>
              )}
              {geminiTestStatus === 'error' && (
                <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                  ✕ エラー: {geminiTestError}
                </span>
              )}
            </div>
          </div>

          {/* Supabase 同期設定 */}
          <div style={{ marginBottom: '16px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.2rem' }}>☁️</span>
              <span style={{ fontWeight: 700, fontSize: '0.96rem' }}>Mac・iPad リアルタイム同期（Supabase）</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '10px' }}>
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
                placeholder="例: my-kitchen-passcode-2026"
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

            {/* Supabase API Key */}
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Supabase API Key（Publishable Key または anon key）</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>sb_publishable_... 推奨</span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type={showSupabaseKey ? 'text' : 'password'}
                  className="form-input"
                  placeholder="sb_publishable_... (または従来の anon key)"
                  value={supabaseAnonKey}
                  onChange={(e) => {
                    setSupabaseAnonKey(e.target.value);
                    setTestStatus(null);
                  }}
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.88rem' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0 10px', fontSize: '0.9rem' }}
                  onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                  title={showSupabaseKey ? 'キーを隠す' : 'キーを表示する'}
                >
                  {showSupabaseKey ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                ※ Supabaseダッシュボード上部の「Connect」ボタン、または「Settings ⚙️」→「API Keys」で取得できます。
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleTestSupabase}
                disabled={!supabaseUrl || !supabaseAnonKey || testStatus === 'testing'}
                style={{ fontSize: '0.8rem' }}
              >
                {testStatus === 'testing' ? '⏳ 接続確認中...' : '🔄 Supabase 接続テスト'}
              </button>
              {testStatus === 'ok' && <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>✓ 接続成功！テーブル認識OK</span>}
            </div>
          </div>

          {/* iPad への一発引き継ぎ（QRコード / URL） */}
          <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📱</span>
                <span style={{ fontWeight: 700, fontSize: '0.94rem', color: '#1e293b' }}>iPadへ一発引き継ぎ（手入力ゼロ）</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => setShowTransferQR(!showTransferQR)}
                style={{ fontSize: '0.78rem' }}
              >
                {showTransferQR ? 'QRコードを閉じる' : '📷 QRコードを表示'}
              </button>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
              Macの全設定（同期キー・Supabase・Gemini）を、iPadのカメラでかざすだけで一瞬で同期完了できます。
            </div>

            {showTransferQR && (
              <div style={{ marginTop: '12px', textAlign: 'center', background: '#fff', padding: '14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  iPadの標準カメラで以下のQRコードを読み取ってください
                </div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getTransferUrl())}`}
                  alt="iPad連携QRコード"
                  style={{ width: '160px', height: '160px', display: 'inline-block', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={handleCopyLink}
                    style={{ fontSize: '0.78rem' }}
                  >
                    {copiedLink ? '✓ 引き継ぎURLをコピーしました！' : '🔗 引き継ぎURLをコピー (AirDrop/メモ用)'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* OpenAI API Key（任意・代替） */}
          <details style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>
              OpenAI API を使用する場合（代替オプション）
              {hasOpenaiKey && <span style={{ color: '#16a34a', marginLeft: '6px' }}>✓ 設定済み</span>}
            </summary>
            <div className="form-group" style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type={showOpenAiKey ? 'text' : 'password'}
                  className="form-input"
                  placeholder="sk-..."
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  style={{ flex: 1, fontFamily: 'monospace' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0 10px', fontSize: '0.9rem' }}
                  onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                >
                  {showOpenAiKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </details>

          {message && (
            <div
              style={{
                marginTop: '10px',
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

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            閉じる
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '設定を保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}
