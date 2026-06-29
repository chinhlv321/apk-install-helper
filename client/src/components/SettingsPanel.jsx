import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Key, Network, RefreshCw, AlertTriangle } from 'lucide-react';

export default function SettingsPanel({ showToast, serverInfo, setServerInfo }) {
  const { t } = useTranslation();
  
  // Tunnel states
  const [tunnelActive, setTunnelActive] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState(null);
  const [tunnelError, setTunnelError] = useState(null);
  const [hasToken, setHasToken] = useState(false);

  // Form input
  const [authtoken, setAuthtoken] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTunnelStatus = async () => {
    try {
      const res = await fetch('/api/tunnel/status');
      const data = await res.json();
      if (data.success) {
        setTunnelActive(data.active);
        setTunnelUrl(data.url);
        setTunnelError(data.error);
        setHasToken(data.hasToken);
      }
    } catch (err) {
      console.error('Error fetching tunnel status:', err);
    }
  };

  const fetchServerInfo = async () => {
    try {
      const res = await fetch('/api/info');
      const data = await res.json();
      if (data.success) {
        setServerInfo(data);
      }
    } catch (err) {
      console.error('Error fetching server info:', err);
    }
  };

  useEffect(() => {
    fetchTunnelStatus();
    fetchServerInfo();
  }, []);

  const handleSaveToken = async (e) => {
    e.preventDefault();
    if (!authtoken.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/tunnel/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authtoken: authtoken.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Authtoken saved', 'success');
        setAuthtoken('');
        fetchTunnelStatus();
      } else {
        showToast(data.error || 'Failed to save token', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTunnel = async () => {
    setLoading(true);
    const endpoint = tunnelActive ? '/api/tunnel/stop' : '/api/tunnel/start';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authtoken: authtoken.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          tunnelActive ? 'Tunnel stopped successfully' : 'Tunnel started successfully', 
          'success'
        );
        if (authtoken.trim()) setAuthtoken('');
        fetchTunnelStatus();
      } else {
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', height: '100%', maxWidth: '800px' }}>
      
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        {t('settings.title')}
      </h2>

      {/* Ngrok Tunneling Setup */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Globe size={18} style={{ color: 'var(--primary)' }} />
          {t('settings.ngrok_title')}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
          {t('settings.ngrok_desc')}
          {' '}
          <a 
            href="https://dashboard.ngrok.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600 }}
          >
            dashboard.ngrok.com
          </a>
        </p>

        {/* Status display */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderRadius: '0.375rem',
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--border)',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings.ngrok_status')}</span>
            <span style={{ 
              fontWeight: 600, 
              fontSize: '0.9rem',
              color: tunnelActive ? 'var(--success)' : 'var(--text-secondary)' 
            }}>
              {tunnelActive ? t('settings.ngrok_connected') : t('settings.ngrok_disconnected')}
            </span>
          </div>

          <button 
            onClick={handleToggleTunnel}
            className={`btn ${tunnelActive ? 'btn-danger' : 'btn-primary'}`}
            disabled={loading || (!hasToken && !authtoken)}
            style={{ padding: '0.5rem 1.25rem' }}
          >
            {loading ? <RefreshCw className="spin" size={14} /> : null}
            {tunnelActive ? t('settings.ngrok_stop') : t('settings.ngrok_start')}
          </button>
        </div>

        {/* Tunnel Url display */}
        {tunnelActive && tunnelUrl && (
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              {t('settings.ngrok_url')}:
            </span>
            <a 
              href={tunnelUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mono"
              style={{
                display: 'block',
                padding: '0.5rem',
                backgroundColor: 'rgba(0,0,0,0.1)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                color: 'var(--primary)',
                fontSize: '0.85rem',
                textDecoration: 'none',
                wordBreak: 'break-all'
              }}
            >
              {tunnelUrl}
            </a>
          </div>
        )}

        {/* Ngrok error message */}
        {tunnelError && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'start',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '0.8rem',
            marginBottom: '1.25rem'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600 }}>Error starting tunnel:</div>
              <div style={{ fontFamily: 'monospace', marginTop: '0.25rem' }}>{tunnelError}</div>
            </div>
          </div>
        )}

        {/* Config Authtoken form */}
        <form onSubmit={handleSaveToken} style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Key size={14} />
              {t('settings.ngrok_token_label')}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="password" 
                className="form-control"
                placeholder={t('settings.ngrok_token_placeholder')}
                value={authtoken}
                onChange={(e) => setAuthtoken(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} disabled={loading}>
                {t('common.save')}
              </button>
            </div>
            {hasToken && (
              <span style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem', display: 'block' }}>
                &bull; Authtoken is already configured on server.
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Network Info */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Network size={18} style={{ color: 'var(--info)' }} />
          {t('settings.info_title')}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {t('settings.local_ips')}:
            </span>
            {serverInfo && serverInfo.localIps && serverInfo.localIps.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.375rem' }}>
                {serverInfo.localIps.map(ip => (
                  <span 
                    key={ip} 
                    className="mono"
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-app)',
                      fontSize: '0.85rem'
                    }}
                  >
                    {ip}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No local IPs found</span>
            )}
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Server Port:
            </span>
            <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {serverInfo ? serverInfo.port : '3000'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
