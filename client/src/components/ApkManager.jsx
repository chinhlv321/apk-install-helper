import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { 
  UploadCloud, Smartphone, QrCode, Globe, 
  Wifi, HelpCircle, ArrowRight, RefreshCw, FileCode, Check 
} from 'lucide-react';

export default function ApkManager({ selectedDeviceId, showToast, serverInfo, tunnelActive, tunnelUrl }) {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [apks, setApks] = useState([]);
  const [installingFile, setInstallingFile] = useState(null);
  
  const [selectedApkForQr, setSelectedApkForQr] = useState(null);
  const [qrType, setQrType] = useState('local'); // 'local' or 'cross'
  const [showTailscaleGuide, setShowTailscaleGuide] = useState(false);

  const fileInputRef = useRef(null);

  const localIp = serverInfo && serverInfo.localIps && serverInfo.localIps.length > 0 
    ? serverInfo.localIps[0] 
    : 'localhost';
  const serverPort = serverInfo ? serverInfo.port : 3000;
  
  const localDownloadUrl = selectedApkForQr 
    ? `http://${localIp}:${serverPort}/download?file=${selectedApkForQr.filename}`
    : '';

  const tailscaleDownloadUrl = selectedApkForQr && serverInfo && serverInfo.tailscaleIp
    ? `http://${serverInfo.tailscaleIp}:${serverPort}/download?file=${selectedApkForQr.filename}`
    : '';

  const crossDownloadUrl = selectedApkForQr && tunnelUrl
    ? `${tunnelUrl}/download?file=${selectedApkForQr.filename}`
    : '';

  const fetchApks = async () => {
    try {
      const res = await fetch('/api/apk/list');
      const data = await res.json();
      if (data.success) {
        setApks(data.apks);
        // Default select latest one for QR code if none selected yet
        if (data.apks.length > 0 && !selectedApkForQr) {
          setSelectedApkForQr(data.apks[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching APKs:', err);
    }
  };

  useEffect(() => {
    fetchApks();
    // Poll status periodically
    const interval = setInterval(() => {
      fetchApks();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const uploadFile = (file) => {
    if (!file.name.endsWith('.apk')) {
      showToast('Please upload a valid .apk file', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('apk', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/apk/upload', true);

    // Track upload progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        if (response.success) {
          showToast('APK uploaded successfully', 'success');
          fetchApks();
          // Auto select the new APK for QR code
          const newApk = {
            filename: response.file.filename,
            originalName: response.file.originalName,
            size: response.file.size
          };
          setSelectedApkForQr(newApk);
        } else {
          showToast(response.error || 'Upload failed', 'error');
        }
      } else {
        showToast('Server error during upload', 'error');
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      showToast('Network error during upload', 'error');
    };

    xhr.send(formData);
  };

  const handleInstall = async (apk) => {
    if (!selectedDeviceId) {
      showToast('Please select a connected device from the sidebar first', 'warning');
      return;
    }

    setInstallingFile(apk.filename);
    showToast(`${t('apk.installing')} ${apk.originalName}`, 'info');

    try {
      const res = await fetch('/api/apk/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDeviceId,
          filename: apk.filename
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${t('apk.install_success')} (${apk.originalName})`, 'success');
      } else {
        showToast(`${t('apk.install_fail')}: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setInstallingFile(null);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', height: '100%' }}>
      
      {/* Upload Section */}
      <div 
        className={`upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          style={{ display: 'none' }} 
          accept=".apk"
        />
        
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <RefreshCw className="spin" size={36} style={{ color: 'var(--primary)' }} />
            <div style={{ fontWeight: 600 }}>Uploading... {uploadProgress}%</div>
            <div style={{ width: '100%', maxWidth: '250px', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.25rem' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.1s ease' }}></div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <UploadCloud size={40} style={{ color: 'var(--text-secondary)' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>{t('apk.upload_title')}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('apk.upload_sub')}</p>
          </div>
        )}
      </div>

      {/* Main split: Left list, Right QR sharing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Recent uploads */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{t('apk.recent_apks')}</h3>
          {apks.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              No APK files uploaded yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {apks.map(apk => (
                <div 
                  key={apk.filename}
                  onClick={() => setSelectedApkForQr(apk)}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--bg-card)',
                    border: `1px solid ${selectedApkForQr && selectedApkForQr.filename === apk.filename ? 'var(--primary)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '1rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all' }}>
                      {apk.originalName}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatSize(apk.size)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(apk.createdAt).toLocaleString()}
                    </span>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstall(apk);
                      }}
                      className="btn btn-primary"
                      disabled={!selectedDeviceId || installingFile === apk.filename}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      {installingFile === apk.filename ? (
                        <>
                          <RefreshCw className="spin" size={12} />
                          {t('common.loading')}
                        </>
                      ) : (
                        <>
                          <Smartphone size={12} />
                          {t('apk.install_btn')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Code sharing */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: 0 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={18} />
            {t('apk.share_title')}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
            {t('apk.share_desc')}
          </p>

          {selectedApkForQr ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Tabs for QR: Local / Tailscale / Ngrok */}
              <div style={{ display: 'flex', width: '100%', border: '1px solid var(--border)', borderRadius: '0.375rem', overflow: 'hidden', marginBottom: '1rem' }}>
                <button 
                  onClick={() => setQrType('local')}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: qrType === 'local' ? 'var(--primary-light)' : 'transparent',
                    color: qrType === 'local' ? 'var(--primary)' : 'var(--text-secondary)',
                    borderRight: '1px solid var(--border)'
                  }}
                >
                  <Wifi size={12} style={{ marginRight: '4px' }} />
                  LAN Wi-Fi
                </button>
                <button 
                  onClick={() => setQrType('tailscale')}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: qrType === 'tailscale' ? 'var(--primary-light)' : 'transparent',
                    color: qrType === 'tailscale' ? 'var(--primary)' : 'var(--text-secondary)',
                    borderRight: '1px solid var(--border)'
                  }}
                >
                  <Globe size={12} style={{ marginRight: '4px' }} />
                  Tailscale VPN
                </button>
                <button 
                  onClick={() => setQrType('ngrok')}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: qrType === 'ngrok' ? 'var(--primary-light)' : 'transparent',
                    color: qrType === 'ngrok' ? 'var(--primary)' : 'var(--text-secondary)'
                  }}
                >
                  <Globe size={12} style={{ marginRight: '4px' }} />
                  Ngrok Internet
                </button>
              </div>

              {/* QR Display */}
              {qrType === 'local' && (
                <>
                  <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                    <QRCodeSVG value={localDownloadUrl} size={150} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all', display: 'block', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                    {localDownloadUrl}
                  </span>
                </>
              )}

              {qrType === 'tailscale' && (
                serverInfo && serverInfo.tailscaleIp ? (
                  <>
                    <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                      <QRCodeSVG value={tailscaleDownloadUrl} size={150} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all', display: 'block', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      {tailscaleDownloadUrl}
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
                    marginBottom: '0.75rem'
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

              {qrType === 'ngrok' && (
                tunnelActive && tunnelUrl ? (
                  <>
                    <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                      <QRCodeSVG value={crossDownloadUrl} size={150} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all', display: 'block', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      {crossDownloadUrl}
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
                    marginBottom: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}>
                    ⚠️ <b>Đường truyền Ngrok đang tắt!</b>
                    <p style={{ marginTop: '0.25rem', fontSize: '0.72rem' }}>
                      Hãy vào tab <b>Cài đặt</b> để bật đường truyền Ngrok trước khi chia sẻ ngoài mạng.
                    </p>
                  </div>
                )
              )}

              <span style={{ fontSize: '0.8rem', fontWeight: 600, wordBreak: 'break-all', display: 'block', maxWidth: '200px' }}>
                {selectedApkForQr.originalName}
              </span>
            </div>
          ) : (
            <div style={{ padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Upload an APK file to view download QR code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
