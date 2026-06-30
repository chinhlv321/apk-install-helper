import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Terminal, Package, Settings, Sun, Moon, 
  Languages, AlertCircle, Info, CheckCircle2,
  ChevronLeft, ChevronRight
} from 'lucide-react';

import DevicePanel from './components/DevicePanel';
import LogcatViewer from './components/LogcatViewer';
import ApkManager from './components/ApkManager';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('logcat');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Language state
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('lang') || 'vi';
  });

  // Toast system state
  const [toasts, setToasts] = useState([]);

  // Server network details state
  const [serverInfo, setServerInfo] = useState(null);
  const [tunnelActive, setTunnelActive] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState(null);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply language
  useEffect(() => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  }, [lang]);

  // Fetch server info and tunnel status on startup + poll tunnel
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch('/api/info');
        const data = await res.json();
        if (data.success) {
          setServerInfo(data);
        }
      } catch (err) {
        console.error('Failed to load server info:', err);
      }
    };

    const fetchTunnel = async () => {
      try {
        const res = await fetch('/api/tunnel/status');
        const data = await res.json();
        if (data.success) {
          setTunnelActive(data.active);
          setTunnelUrl(data.url);
        }
      } catch (err) {
        console.error('Failed to load tunnel status:', err);
      }
    };

    fetchInfo();
    fetchTunnel();

    const interval = setInterval(fetchTunnel, 5000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'vi' ? 'en' : 'vi');
  };

  return (
    <div className="app-container">
      {/* Sidebar - Device Manager */}
      <aside className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
        <DevicePanel 
          selectedDeviceId={selectedDeviceId}
          setSelectedDeviceId={setSelectedDeviceId}
          showToast={showToast}
          serverInfo={serverInfo}
          tunnelActive={tunnelActive}
          tunnelUrl={tunnelUrl}
        />
      </aside>

      {/* Main Workspace */}
      <main className="main-content">
        {/* Top Header Bar */}
        <header className="header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Sidebar toggle button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem', borderRadius: '0.375rem' }}
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Navigation tabs */}
            <nav className="tab-nav">
              <button 
                onClick={() => setActiveTab('logcat')}
                className={`tab-button ${activeTab === 'logcat' ? 'active' : ''}`}
              >
                <Terminal size={18} />
                {t('nav.logcat')}
              </button>
              <button 
                onClick={() => setActiveTab('apk')}
                className={`tab-button ${activeTab === 'apk' ? 'active' : ''}`}
              >
                <Package size={18} />
                {t('nav.apk')}
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
              >
                <Settings size={18} />
                Cài đặt
              </button>
            </nav>
          </div>

          {/* Quick Controls (Theme, Language) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Language Selector */}
            <button 
              onClick={toggleLanguage}
              className="btn btn-secondary"
              style={{ padding: '0.5rem', borderRadius: '50%' }}
              title="Toggle Language"
            >
              <Languages size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, marginLeft: '4px', textTransform: 'uppercase' }}>
                {lang}
              </span>
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{ padding: '0.5rem', borderRadius: '50%' }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Tab Body Viewports */}
        <div style={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
          {activeTab === 'logcat' && (
            <LogcatViewer 
              deviceId={selectedDeviceId} 
              showToast={showToast} 
            />
          )}

          {activeTab === 'apk' && (
            <ApkManager 
              selectedDeviceId={selectedDeviceId}
              showToast={showToast}
              serverInfo={serverInfo}
              tunnelActive={tunnelActive}
              tunnelUrl={tunnelUrl}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel 
              showToast={showToast}
              serverInfo={serverInfo}
              setServerInfo={setServerInfo}
            />
          )}
        </div>
      </main>

      {/* Floating Toast Notification Containers */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className="toast"
            style={{
              borderLeft: `4px solid ${
                toast.type === 'success' ? 'var(--success)' : 
                toast.type === 'error' ? 'var(--danger)' : 
                toast.type === 'warning' ? 'var(--warning)' : 
                'var(--info)'
              }`
            }}
          >
            {toast.type === 'success' && <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />}
            {toast.type === 'error' && <AlertCircle size={16} style={{ color: 'var(--danger)' }} />}
            {toast.type === 'warning' && <AlertCircle size={16} style={{ color: 'var(--warning)' }} />}
            {toast.type === 'info' && <Info size={16} style={{ color: 'var(--info)' }} />}
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
