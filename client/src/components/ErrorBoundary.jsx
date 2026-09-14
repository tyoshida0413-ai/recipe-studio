import React from 'react';

/**
 * React Error Boundary
 * レンダリング例外が発生しても画面全体が真っ白になるクラッシュを防ぎ、
 * エラー内容の表示とワンタップでの安全な回復（再読み込み・リセット）を提供します。
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Caught by Boundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    localStorage.removeItem('recipe_ai_initialized');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: '20px',
          fontFamily: "'Noto Sans JP', sans-serif",
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            border: '1px solid #fee2e2',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🍳⚠️</div>
            <h2 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '8px' }}>
              表示中に一時的なエラーが発生しました
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
              データの読み込みまたはコンポーネントの表示中にエラーが発生しました。
              下のボタンから画面を再読み込みしてください。
            </p>

            <div style={{
              background: '#fef2f2',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              textAlign: 'left',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: '24px',
              wordBreak: 'break-all',
              maxHeight: '120px',
              overflowY: 'auto',
            }}>
              {this.state.error?.message || 'Unknown Error'}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: '#e05a2b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                🔄 画面を再読み込み
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                データを初期化
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
