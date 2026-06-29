import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Smartphone, Wifi, WifiOff, Plus, Trash2, 
  Bookmark, RefreshCw, QrCode, HelpCircle, Check 
} from 'lucide-react';

export default function DevicePanel({ 
  selectedDeviceId, 
  setSelectedDeviceId, 
  showToast,
  serverInfo,
  tunnelActive,
  tunnelUrl
}) {
  const { t } = useTranslation();
  const [devices, setDevices] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [pairMethod, setPairMethod] = useState('qr'); // 'qr' or 'manual'
  const [pairQrType, setPairQrType] = useState('local'); // 'local' or 'cross'
  const [guideTab, setGuideTab] = useState('pair'); // 'pair' or 'connect'

  // Form states
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('5555');
  const [pairingCode, setPairingCode] = useState('');
  const [friendlyName, setFriendlyName] = useState('');

  const serverUrl = serverInfo && serverInfo.localIps && serverInfo.localIps.length > 0 
    ? `http://${serverInfo.localIps[0]}:${serverInfo.port}` 
    : window.location.origin;

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices);
        // Auto select first device if none selected
        if (data.devices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(data.devices[0].id);
        }
      }
    } catch (err) {
      showToast(t('common.error') + ': ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await fetch('/api/devices/saved');
      const data = await res.json();
      if (data.success) {
        setBookmarks(data.bookmarks);
      }
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchBookmarks();
    // Poll devices every 5 seconds to keep list updated
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!ip || !port) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/devices/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Connected successfully', 'success');
        setShowConnectModal(false);
        fetchDevices();
      } else {
        showToast(data.error || 'Connection failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePair = async (e) => {
    e.preventDefault();
    if (!ip || !port || !pairingCode) return;

    setLoading(true);
    try {
      const res = await fetch('/api/devices/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port, code: pairingCode })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Paired successfully! Now you can connect.', 'success');
        setShowPairModal(false);
        setShowConnectModal(true); // Open connect directly
      } else {
        showToast(data.error || 'Pairing failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (deviceId) => {
    try {
      const res = await fetch('/api/devices/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Device disconnected', 'success');
        if (selectedDeviceId === deviceId) {
          setSelectedDeviceId('');
        }
        fetchDevices();
      } else {
        showToast(data.error || 'Failed to disconnect', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddBookmark = async (e) => {
    e.preventDefault();
    if (!ip || !port) return;

    try {
      const res = await fetch('/api/devices/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port, name: friendlyName })
      });
      const data = await res.json();
      if (data.success) {
        setBookmarks(data.bookmarks);
        showToast('Device bookmarked', 'success');
        setFriendlyName('');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteBookmark = async (id) => {
    try {
      const res = await fetch(`/api/devices/saved/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setBookmarks(data.bookmarks);
        showToast('Bookmark removed', 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBookmarkConnect = (b) => {
    setIp(b.ip);
    setPort(b.port);
    setShowConnectModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Title & Refresh */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Smartphone size={18} />
          {t('devices.title')}
        </h2>
        <button 
          onClick={fetchDevices} 
          className="btn btn-secondary" 
          style={{ padding: '0.375rem', borderRadius: '50%' }}
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Connected devices list */}
      <div style={{ padding: '1rem', overflowY: 'auto', flexGrow: 1 }}>
        {devices.length === 0 ? (
          <div style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            border: '1px dashed var(--border)',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            <WifiOff size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>{t('devices.no_devices')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {devices.map(dev => (
              <div 
                key={dev.id} 
                onClick={() => setSelectedDeviceId(dev.id)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${selectedDeviceId === dev.id ? 'var(--primary)' : 'var(--border)'}`,
                  backgroundColor: selectedDeviceId === dev.id ? 'var(--primary-light)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                  <div style={{
                    color: dev.status === 'device' ? 'var(--success)' : 'var(--danger)',
                    display: 'flex'
                  }}>
                    {dev.isWireless ? <Wifi size={18} /> : <Smartphone size={18} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ 
                      fontWeight: 500, 
                      fontSize: '0.9rem',
                      color: selectedDeviceId === dev.id ? 'var(--primary)' : 'var(--text-primary)',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}>
                      {dev.model}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {dev.id}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {dev.status === 'device' && selectedDeviceId === dev.id && (
                    <Check size={14} style={{ color: 'var(--primary)', marginRight: '4px' }} />
                  )}
                  {dev.isWireless && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisconnect(dev.id);
                      }}
                      className="btn"
                      style={{
                        padding: '0.25rem',
                        backgroundColor: 'transparent',
                        color: 'var(--danger)',
                        border: 'none'
                      }}
                      title={t('devices.disconnect')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Buttons for Pair and Connect */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setShowPairModal(true)} 
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.25rem' }}
          >
            <Plus size={14} />
            {t('devices.pair_wireless')}
          </button>
          <button 
            onClick={() => setShowConnectModal(true)} 
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.25rem' }}
          >
            <Wifi size={14} />
            {t('devices.connect_wireless')}
          </button>
        </div>

        <button 
          onClick={() => setShowQrModal(true)} 
          className="btn btn-secondary"
          style={{ width: '100%', marginBottom: '1.5rem', fontSize: '0.85rem' }}
        >
          <HelpCircle size={16} />
          {t('devices.connection_guide_btn')}
        </button>

        {/* Bookmarks section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Bookmark size={14} />
            {t('devices.bookmarks')}
          </h3>

          {bookmarks.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
              {t('devices.no_bookmarks')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {bookmarks.map(b => (
                <div 
                  key={b.id}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem'
                  }}
                >
                  <div 
                    onClick={() => handleBookmarkConnect(b)}
                    style={{ cursor: 'pointer', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                  >
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {b.ip}:{b.port}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteBookmark(b.id)}
                    className="btn"
                    style={{ padding: '0.25rem', color: 'var(--text-muted)', background: 'transparent' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Bookmark Fast Form */}
          <form onSubmit={handleAddBookmark} style={{ marginTop: '0.75rem', display: 'flex', gap: '0.25rem' }}>
            <input 
              type="text" 
              placeholder="IP:Port" 
              value={ip ? `${ip}:${port}` : ''}
              onChange={(e) => {
                const parts = e.target.value.split(':');
                setIp(parts[0]);
                if (parts[1]) setPort(parts[1]);
              }}
              className="form-control"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              required
            />
            <button type="submit" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
              <Plus size={12} />
            </button>
          </form>
        </div>
      </div>

      {/* CONNECT MODAL */}
      {showConnectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: 600 }}>{t('devices.connect_wireless')}</h3>
              <button onClick={() => setShowConnectModal(false)} className="btn btn-secondary" style={{ padding: '0.25rem' }}>&times;</button>
            </div>
            <form onSubmit={handleConnect}>
              <div className="form-group">
                <label className="form-label">{t('devices.ip_label')}</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="192.168.1.100" 
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('devices.port_label')}</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required 
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowConnectModal(false)} className="btn btn-secondary">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {t('devices.connect')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAIR MODAL */}
      {showPairModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600 }}>{t('devices.pair_wireless')}</h3>
              <button onClick={() => setShowPairModal(false)} className="btn btn-secondary" style={{ padding: '0.25rem' }}>&times;</button>
            </div>
            
            {/* Pair Method tabs */}
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '0.375rem', overflow: 'hidden', marginBottom: '1.25rem' }}>
              <button 
                type="button"
                onClick={() => setPairMethod('qr')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  backgroundColor: pairMethod === 'qr' ? 'var(--primary-light)' : 'transparent',
                  color: pairMethod === 'qr' ? 'var(--primary)' : 'var(--text-secondary)'
                }}
              >
                Pair by Phone (QR)
              </button>
              <button 
                type="button"
                onClick={() => setPairMethod('manual')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  backgroundColor: pairMethod === 'manual' ? 'var(--primary-light)' : 'transparent',
                  color: pairMethod === 'manual' ? 'var(--primary)' : 'var(--text-secondary)'
                }}
              >
                Pair on PC (Manual)
              </button>
            </div>

            {pairMethod === 'qr' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem' }}>
                {/* Warning box */}
                <div style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.375rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textAlign: 'left'
                }}>
                  ⚠️ KHÔNG dùng nút "Pair device with QR code" trong Android Settings — nút đó chỉ hoạt động với Android Studio.
                </div>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left', lineHeight: '1.6' }}>
                  <b>Bước 1:</b> Trên điện thoại, vào <b>Developer Options &gt; Wireless debugging &gt; Pair device with pairing code</b> (ghép đôi bằng mã).<br/>
                  <b>Bước 2:</b> Dùng <b>Camera, Zalo, hoặc Google Lens</b> quét mã QR bên dưới để mở trang nhập thông tin.<br/>
                  <b>Bước 3:</b> Nhập Port và Mã PIN 6 số từ màn hình điện thoại vào trang web.
                </p>

                {/* Tabs for QR Local/Ngrok */}
                <div style={{ display: 'flex', width: '100%', border: '1px solid var(--border)', borderRadius: '0.375rem', overflow: 'hidden', margin: '0.5rem 0' }}>
                  <button 
                    type="button"
                    onClick={() => setPairQrType('local')}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      backgroundColor: pairQrType === 'local' ? 'var(--primary-light)' : 'transparent',
                      color: pairQrType === 'local' ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                  >
                    Mạng Wi-Fi (LAN)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPairQrType('cross')}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      backgroundColor: pairQrType === 'cross' ? 'var(--primary-light)' : 'transparent',
                      color: pairQrType === 'cross' ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                  >
                    Internet (Ngrok)
                  </button>
                </div>

                {/* QR Display */}
                {pairQrType === 'local' ? (
                  <>
                    <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '0.5rem', margin: '0.25rem 0' }}>
                      <QRCodeSVG value={`${serverUrl}/pair-mobile`} size={180} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {serverUrl}/pair-mobile
                    </span>
                  </>
                ) : tunnelActive && tunnelUrl ? (
                  <>
                    <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '0.5rem', margin: '0.25rem 0' }}>
                      <QRCodeSVG value={`${tunnelUrl}/pair-mobile`} size={180} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {tunnelUrl}/pair-mobile
                    </span>
                  </>
                ) : (
                  <div style={{
                    width: '180px',
                    height: '180px',
                    border: '1px dashed var(--border)',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    margin: '0.25rem 0'
                  }}>
                    Chưa bật Ngrok. Hãy cấu hình & bật Ngrok trong tab Cài đặt để kết nối ngoài mạng.
                  </div>
                )}
                
                <button type="button" onClick={() => setShowPairModal(false)} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  {t('common.close')}
                </button>
              </div>
            ) : (
              <form onSubmit={handlePair}>
                <div className="form-group">
                  <label className="form-label">{t('devices.ip_label')}</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="192.168.1.100" 
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('devices.port_label')}</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="37182"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('devices.code_label')}</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="123456"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value)}
                    required 
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowPairModal(false)} className="btn btn-secondary">
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {t('devices.pair_wireless')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CONNECTION & PAIRING GUIDE MODAL */}
      {showQrModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
            <div className="modal-header" style={{ flexShrink: 0, paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{t('devices.guide_modal_title')}</h3>
              <button onClick={() => setShowQrModal(false)} className="btn btn-secondary" style={{ padding: '0.25rem' }}>&times;</button>
            </div>
            
            {/* Guide Tabs */}
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '0.375rem', overflow: 'hidden', marginBottom: '1rem', flexShrink: 0 }}>
              <button 
                type="button"
                onClick={() => setGuideTab('pair')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: guideTab === 'pair' ? 'var(--primary-light)' : 'transparent',
                  color: guideTab === 'pair' ? 'var(--primary)' : 'var(--text-secondary)'
                }}
              >
                {t('devices.guide_tab_pair')}
              </button>
              <button 
                type="button"
                onClick={() => setGuideTab('connect')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: guideTab === 'connect' ? 'var(--primary-light)' : 'transparent',
                  color: guideTab === 'connect' ? 'var(--primary)' : 'var(--text-secondary)'
                }}
              >
                {t('devices.guide_tab_connect')}
              </button>
            </div>

            {/* Guide Content (Scrollable) */}
            <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem', lineHeight: '1.5' }}>
              {guideTab === 'pair' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', marginTop: '2px' }}>1</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('devices.guide_pair_title1')}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{t('devices.guide_pair_desc1')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', marginTop: '2px' }}>2</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('devices.guide_pair_title2')}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{t('devices.guide_pair_desc2')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', marginTop: '2px' }}>3</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('devices.guide_pair_title3')}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{t('devices.guide_pair_desc3')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', marginTop: '2px' }}>4</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('devices.guide_pair_title4')}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{t('devices.guide_pair_desc4')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', marginTop: '2px' }}>5</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('devices.guide_pair_title5')}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{t('devices.guide_pair_desc5')}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Option 1: Already paired */}
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>{t('devices.guide_connect_desc1')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span>•</span>
                        <span>{t('devices.guide_connect_step1_1')}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span>•</span>
                        <span>{t('devices.guide_connect_step1_2')}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span>•</span>
                        <span>{t('devices.guide_connect_step1_3')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>

                  {/* Option 2: Android 10 or activate via USB */}
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>{t('devices.guide_connect_desc2')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span>•</span>
                        <span>{t('devices.guide_connect_step2_1')}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span>•</span>
                        <span>{t('devices.guide_connect_step2_2')}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span>•</span>
                        <span>{t('devices.guide_connect_step2_3')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}            </div>

            <div style={{ flexShrink: 0, marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <button onClick={() => setShowQrModal(false)} className="btn btn-secondary" style={{ width: '100%' }}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
