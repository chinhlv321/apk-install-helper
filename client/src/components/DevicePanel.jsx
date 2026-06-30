import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';
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
  const [pairQrType, setPairQrType] = useState('local'); // 'local', 'tailscale', or 'ngrok'
  const [pairingMode, setPairingMode] = useState('native'); // 'native' or 'web'
  const [nativePairData, setNativePairData] = useState(null);
  const [nativePairStatus, setNativePairStatus] = useState(null);
  const [guideTab, setGuideTab] = useState('pair'); // 'pair' or 'connect'
  const [showTailscaleGuide, setShowTailscaleGuide] = useState(false);

  // Form states
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('5555');
  const [pairingCode, setPairingCode] = useState('');
  const [friendlyName, setFriendlyName] = useState('');

  const serverUrl = serverInfo && serverInfo.localIps && serverInfo.localIps.length > 0 
    ? `http://${serverInfo.localIps[0]}:${serverInfo.port}` 
    : window.location.origin;

  useEffect(() => {
    if (!showPairModal || pairMethod !== 'qr' || pairingMode !== 'native') {
      if (nativePairData) {
        fetch('/api/devices/pair-qr/cancel', { method: 'POST' }).catch(() => {});
        setNativePairData(null);
        setNativePairStatus(null);
      }
      return;
    }

    let socket = null;

    const startSession = async () => {
      try {
        const res = await fetch('/api/devices/pair-qr/start', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setNativePairData(data);
          setNativePairStatus({ status: 'waiting', message: 'Đang chờ thiết bị quét mã QR...' });

          socket = io(window.location.origin);
          
          socket.on('pair:status', (update) => {
            if (update.serviceName === data.serviceName) {
              setNativePairStatus(update);
              
              if (update.status === 'success') {
                showToast('Ghép đôi và kết nối thành công!', 'success');
                fetchDevices();
                setTimeout(() => {
                  setShowPairModal(false);
                }, 2000);
              }
            }
          });
        } else {
          showToast(data.error || 'Không thể khởi động QR Pairing', 'error');
        }
      } catch (err) {
        showToast('Lỗi kết nối server', 'error');
      }
    };

    startSession();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      fetch('/api/devices/pair-qr/cancel', { method: 'POST' }).catch(() => {});
    };
  }, [showPairModal, pairMethod, pairingMode]);

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
              {bookmarks.map(b => {
                const connectedDev = devices.find(d => d.id === b.id || d.id.startsWith(b.ip + ':'));
                const displayName = (b.name && b.name !== b.id) ? b.name : (connectedDev ? connectedDev.model : b.id);
                return (
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
                        {displayName}
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
                );
              })}
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

            {/* Pairing Mode Select: Native vs Web Fallback */}
            {pairMethod === 'qr' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', width: '100%' }}>
                <button 
                  type="button" 
                  onClick={() => setPairingMode('native')}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    border: 'none',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    backgroundColor: pairingMode === 'native' ? 'var(--primary)' : 'var(--bg-app)',
                    color: pairingMode === 'native' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  Native QR (Android Studio)
                </button>
                <button 
                  type="button" 
                  onClick={() => setPairingMode('web')}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    border: 'none',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    backgroundColor: pairingMode === 'web' ? 'var(--primary)' : 'var(--bg-app)',
                    color: pairingMode === 'web' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  Web QR (Zalo/Camera fallback)
                </button>
              </div>
            )}

            {pairMethod === 'qr' ? (
              pairingMode === 'native' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem', width: '100%' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left', lineHeight: '1.5', width: '100%' }}>
                    <b>Bước 1:</b> Trên điện thoại, vào <b>Gỡ lỗi không dây (Wireless debugging)</b>.<br/>
                    <b>Bước 2:</b> Chọn <b>Ghép nối thiết bị bằng mã QR (Pair device with QR code)</b>.<br/>
                    <b>Bước 3:</b> Chĩa máy ảnh ghép đôi quét trực tiếp mã QR dưới đây.
                  </p>

                  <div style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid #f59e0b',
                    color: '#d97706',
                    fontSize: '0.72rem',
                    textAlign: 'left',
                    lineHeight: '1.4'
                  }}>
                    💡 <b>Yêu cầu quan trọng:</b> PC và điện thoại phải kết nối <b>chung Wi-Fi (LAN)</b>. Cách này KHÔNG hoạt động qua VPN hoặc khác mạng (Tailscale/Internet) vì mDNS bị chặn. Nếu điện thoại xoay xoay quá lâu không kết nối, hãy chọn tab <b>Web QR</b> ở trên và làm theo hướng dẫn sử dụng Tailscale.
                  </div>

                  {nativePairData ? (
                    <>
                      <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '0.5rem', margin: '0.25rem 0' }}>
                        <QRCodeSVG value={nativePairData.qrPayload} size={180} />
                      </div>
                      
                      {/* Real-time Status Area */}
                      {nativePairStatus && (
                        <div style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '0.375rem',
                          backgroundColor: 
                            nativePairStatus.status === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                            nativePairStatus.status === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                            'rgba(59, 130, 246, 0.1)',
                          border: `1px solid ${
                            nativePairStatus.status === 'success' ? 'var(--success)' :
                            nativePairStatus.status === 'error' ? 'var(--danger)' :
                            'var(--primary)'
                          }`,
                          color: 
                            nativePairStatus.status === 'success' ? 'var(--success)' :
                            nativePairStatus.status === 'error' ? 'var(--danger)' :
                            'var(--text-primary)',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          textAlign: 'center'
                        }}>
                          {nativePairStatus.status === 'waiting' && '🔄 ' + nativePairStatus.message}
                          {nativePairStatus.status === 'discovered' && '🔍 ' + nativePairStatus.message}
                          {nativePairStatus.status === 'pairing' && '🔑 ' + nativePairStatus.message}
                          {nativePairStatus.status === 'paired' && '🎉 ' + nativePairStatus.message}
                          {nativePairStatus.status === 'connecting' && '🔌 ' + nativePairStatus.message}
                          {nativePairStatus.status === 'success' && '✅ ' + nativePairStatus.message}
                          {nativePairStatus.status === 'error' && '❌ ' + (nativePairStatus.error || 'Lỗi ghép đôi.')}
                        </div>
                      )}
                      
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Service Name: {nativePairData.serviceName} | PIN: {nativePairData.password}
                      </span>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', gap: '0.5rem' }}>
                      <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Đang tạo mã QR...</span>
                    </div>
                  )}

                  <button type="button" onClick={() => setShowPairModal(false)} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                    {t('common.close')}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem', width: '100%' }}>
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
                    <b>Bước 1:</b> Trên điện thoại, vào <b>Wireless debugging &gt; Pair device with pairing code</b> (ghép đôi bằng mã).<br/>
                    <b>Bước 2:</b> Dùng <b>Camera, Zalo, hoặc Google Lens</b> quét mã QR bên dưới để mở trang nhập thông tin.<br/>
                    <b>Bước 3:</b> Nhập Port và Mã PIN 6 số từ màn hình điện thoại vào trang web.
                  </p>

                  {/* Tabs for QR: Local / Tailscale / Ngrok */}
                  <div style={{ display: 'flex', width: '100%', border: '1px solid var(--border)', borderRadius: '0.375rem', overflow: 'hidden', margin: '0.5rem 0' }}>
                    <button 
                      type="button"
                      onClick={() => setPairQrType('local')}
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        border: 'none',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: pairQrType === 'local' ? 'var(--primary-light)' : 'transparent',
                        color: pairQrType === 'local' ? 'var(--primary)' : 'var(--text-secondary)',
                        borderRight: '1px solid var(--border)'
                      }}
                    >
                      LAN Wi-Fi
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPairQrType('tailscale')}
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        border: 'none',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: pairQrType === 'tailscale' ? 'var(--primary-light)' : 'transparent',
                        color: pairQrType === 'tailscale' ? 'var(--primary)' : 'var(--text-secondary)',
                        borderRight: '1px solid var(--border)'
                      }}
                    >
                      Tailscale VPN
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPairQrType('ngrok')}
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        border: 'none',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: pairQrType === 'ngrok' ? 'var(--primary-light)' : 'transparent',
                        color: pairQrType === 'ngrok' ? 'var(--primary)' : 'var(--text-secondary)'
                      }}
                    >
                      Ngrok Internet
                    </button>
                  </div>

                  {/* QR Display */}
                  {pairQrType === 'local' && (
                    <>
                      <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '0.5rem', margin: '0.25rem 0' }}>
                        <QRCodeSVG value={`${serverUrl}/pair-mobile`} size={180} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {serverUrl}/pair-mobile
                      </span>
                    </>
                  )}

                  {pairQrType === 'tailscale' && (
                    serverInfo && serverInfo.tailscaleIp ? (
                      <>
                        <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '0.5rem', margin: '0.25rem 0' }}>
                          <QRCodeSVG value={`http://${serverInfo.tailscaleIp}:${serverInfo.port}/pair-mobile`} size={180} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          http://{serverInfo.tailscaleIp}:{serverInfo.port}/pair-mobile
                        </span>
                        
                        <button 
                          type="button"
                          onClick={() => setShowTailscaleGuide(!showTailscaleGuide)}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.3rem 0.6rem',
                            marginTop: '0.5rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            width: 'auto'
                          }}
                        >
                          {showTailscaleGuide ? 'Ẩn hướng dẫn Tailscale' : '❓ Hướng dẫn kết nối Tailscale'}
                        </button>
                        
                        {showTailscaleGuide && (
                          <div style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0.375rem',
                            backgroundColor: 'var(--bg-app)',
                            textAlign: 'left',
                            fontSize: '0.72rem',
                            lineHeight: '1.4',
                            marginTop: '0.5rem'
                          }}>
                            <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                              Các bước kết nối Tailscale VPN:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                              <div><b>Bước 1:</b> Cài đặt Tailscale cho PC tại <a href="https://tailscale.com/download" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>tailscale.com/download</a>.</div>
                              <div><b>Bước 2:</b> Tải app <b>Tailscale</b> trên điện thoại từ CH Play / App Store.</div>
                              <div><b>Bước 3:</b> Đăng nhập <b>cùng một tài khoản</b> trên cả PC và Phone, sau đó bật VPN lên.</div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{
                        width: '100%',
                        padding: '1rem',
                        border: '1px dashed var(--border)',
                        borderRadius: '0.5rem',
                        backgroundColor: 'var(--bg-app)',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        lineHeight: '1.45',
                        margin: '0.25rem 0'
                      }}>
                        <div style={{ fontWeight: 600, color: '#d97706', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ⚠️ Chưa phát hiện VPN Tailscale!
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <div><b>Bước 1:</b> Tải & cài đặt Tailscale cho PC tại <a href="https://tailscale.com/download" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>tailscale.com/download</a>.</div>
                          <div><b>Bước 2:</b> Cài đặt app <b>Tailscale</b> trên điện thoại từ Google Play Store hoặc App Store.</div>
                          <div><b>Bước 3:</b> Đăng nhập <b>cùng một tài khoản</b> trên cả PC và Phone, sau đó bật VPN (Connect) trên cả 2 máy.</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.25rem', borderTop: '1px solid var(--border)', paddingTop: '0.4rem' }}>
                            ℹ️ Sau khi bật, trang web sẽ tự động nhận diện và hiển thị mã QR Tailscale.
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {pairQrType === 'ngrok' && (
                    tunnelActive && tunnelUrl ? (
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
                        width: '100%',
                        padding: '1rem',
                        border: '1px dashed var(--border)',
                        borderRadius: '0.5rem',
                        backgroundColor: 'var(--bg-app)',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        lineHeight: '1.45',
                        margin: '0.25rem 0',
                        color: 'var(--text-secondary)'
                      }}>
                        ⚠️ <b>Đường truyền Ngrok đang tắt!</b>
                        <p style={{ marginTop: '0.25rem', fontSize: '0.72rem' }}>
                          Hãy vào tab <b>Cài đặt</b> để bật đường truyền Ngrok trước khi chia sẻ ngoài mạng.
                        </p>
                      </div>
                    )
                  )}
                  
                  <button type="button" onClick={() => setShowPairModal(false)} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                    {t('common.close')}
                  </button>
                </div>
              )
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
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: guideTab === 'pair' ? 'var(--primary-light)' : 'transparent',
                  color: guideTab === 'pair' ? 'var(--primary)' : 'var(--text-secondary)'
                }}
              >
                1. Ghép đôi (Android 11+)
              </button>
              <button 
                type="button"
                onClick={() => setGuideTab('connect')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: guideTab === 'connect' ? 'var(--primary-light)' : 'transparent',
                  color: guideTab === 'connect' ? 'var(--primary)' : 'var(--text-secondary)'
                }}
              >
                2. Kết nối không dây
              </button>
              <button 
                type="button"
                onClick={() => setGuideTab('tailscale')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: guideTab === 'tailscale' ? 'var(--primary-light)' : 'transparent',
                  color: guideTab === 'tailscale' ? 'var(--primary)' : 'var(--text-secondary)'
                }}
              >
                3. Ngoại mạng (Tailscale)
              </button>
            </div>

            {/* Guide Content (Scrollable) */}
            <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem', lineHeight: '1.5' }}>
              {guideTab === 'pair' && (
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
              )}

              {guideTab === 'connect' && (
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
              )}

              {guideTab === 'tailscale' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                      Tại sao cần dùng Tailscale VPN?
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.45' }}>
                      Khi điện thoại dùng mạng di động (3G/4G/5G), Wi-Fi khác mạng PC, hoặc PC kết nối qua chia sẻ mạng (NAT của Mac Mini, v.v.), hai thiết bị sẽ <b>không thể nhìn thấy nhau</b>. Tailscale giúp tạo một đường truyền mạng ảo bảo mật chung (VPN) để PC kết nối trực tiếp đến điện thoại như trong cùng mạng LAN.
                    </p>
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>

                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      Hướng dẫn cài đặt chi tiết 3 bước:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ background: 'var(--primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', marginTop: '2px' }}>1</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Cài đặt Tailscale trên PC</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                            Tải Tailscale cho máy tính của bạn tại trang chủ <a href="https://tailscale.com/download" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>tailscale.com/download</a>. Sau đó mở phần mềm lên và đăng nhập tài khoản.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ background: 'var(--primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', marginTop: '2px' }}>2</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Cài đặt Tailscale trên Điện thoại</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                            Tìm và tải ứng dụng <b>Tailscale</b> trên cửa hàng Google Play Store (hoặc App Store). Đăng nhập bằng <b>cùng một tài khoản</b> mà bạn đã đăng nhập trên máy tính.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ background: 'var(--primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', marginTop: '2px' }}>3</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Bật VPN và lấy IP Kết nối</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                            Bật kết nối (gạt nút Connect) trên cả 2 máy. 
                            <br />
                            • Lúc này điện thoại sẽ có 1 địa chỉ IP mạng ảo (dạng <code style={{ color: 'var(--success)', fontWeight: 'bold' }}>100.x.y.z</code>).
                            <br />
                            • Bạn dùng tab <b>Pair on PC (Manual)</b> trên PC, nhập IP Tailscale này của điện thoại, Cổng ghép đôi và mã PIN hiển thị ở màn hình Wireless Debugging để ghép nối trực tiếp.
                          </div>
                        </div>
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
