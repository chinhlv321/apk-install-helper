import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import io from 'socket.io-client';
import { 
  Play, Square, Trash2, Download, Scroll, 
  Search, SlidersHorizontal, Filter 
} from 'lucide-react';

const LOG_LEVELS = ['V', 'D', 'I', 'W', 'E', 'F'];
const MAX_LOGS = 50000; // Keep browser tab from crashing
const ITEM_HEIGHT = 24; // px

export default function LogcatViewer({ deviceId, showToast }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Filters state
  const [minLevel, setMinLevel] = useState('V');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [pidFilter, setPidFilter] = useState('');
  const [packageNameFilter, setPackageNameFilter] = useState('');
  const [pidMap, setPidMap] = useState({});

  // Socket reference
  const socketRef = useRef(null);
  // Log buffer ref to handle high frequency logs without React state choke
  const logBuffer = useRef([]);
  // UI Scroll references
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // Initialize socket connection
  useEffect(() => {
    // Connect to backend socket
    socketRef.current = io(window.location.origin);

    socketRef.current.on('connect', () => {
      console.log('Socket connected for Logcat');
    });

    socketRef.current.on('logcat:data', ({ deviceId: incomingId, entry }) => {
      if (incomingId !== deviceId) return;
      
      logBuffer.current.push(entry);
      
      // Limit buffer size
      if (logBuffer.current.length > MAX_LOGS) {
        logBuffer.current.shift();
      }
    });

    socketRef.current.on('logcat:error', ({ error }) => {
      showToast(error, 'error');
    });

    socketRef.current.on('logcat:close', () => {
      setIsStreaming(false);
    });

    // Flush buffer to state regularly (every 100ms) to throttle updates
    const flushInterval = setInterval(() => {
      if (logBuffer.current.length > 0) {
        setLogs([...logBuffer.current]);
      }
    }, 100);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      clearInterval(flushInterval);
    };
  }, [deviceId]);

  // Fetch running processes periodically for package filtering mapping
  useEffect(() => {
    if (!deviceId) {
      setPidMap({});
      return;
    }

    const fetchProcesses = async () => {
      try {
        const response = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/processes`);
        const data = await response.json();
        if (data.success) {
          const map = {};
          data.processes.forEach(p => {
            map[p.pid] = p.name;
          });
          setPidMap(map);
        }
      } catch (err) {
        console.error('Failed to fetch processes:', err);
      }
    };

    fetchProcesses();
    const interval = setInterval(fetchProcesses, 4000);

    return () => clearInterval(interval);
  }, [deviceId]);

  // Restart streaming when device changes
  useEffect(() => {
    if (isStreaming) {
      stopStreaming();
    }
    clearLogs();
    if (deviceId) {
      startStreaming();
    }
  }, [deviceId]);

  const startStreaming = () => {
    if (!deviceId) {
      showToast('No device selected', 'warning');
      return;
    }
    if (socketRef.current) {
      logBuffer.current = [];
      setLogs([]);
      socketRef.current.emit('logcat:start', { deviceId });
      setIsStreaming(true);
      showToast(t('logcat.resumed'), 'success');
    }
  };

  const stopStreaming = () => {
    if (socketRef.current && deviceId) {
      socketRef.current.emit('logcat:stop', { deviceId });
      setIsStreaming(false);
      showToast(t('logcat.paused'), 'info');
    }
  };

  const clearLogs = () => {
    logBuffer.current = [];
    setLogs([]);
  };

  const handleCopyLine = (log) => {
    const fullLine = `${log.time} ${log.pid}/${log.tid} ${log.priority} ${log.tag}: ${log.message}`;
    navigator.clipboard.writeText(fullLine).then(() => {
      showToast(t('logcat.copied_line'), 'success');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleExport = () => {
    if (filteredLogs.length === 0) {
      showToast('No logs to export', 'warning');
      return;
    }
    
    // Create text file dump
    const logDump = filteredLogs.map(l => 
      `${l.time} ${l.pid} ${l.tid} ${l.priority} ${l.tag}: ${l.message}`
    ).join('\n');

    const blob = new Blob([logDump], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logcat_${deviceId}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Logs exported successfully', 'success');
  };

  // Measure container height for virtual list
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = (e) => {
    const { scrollTop: newScrollTop, scrollHeight, clientHeight } = e.target;
    setScrollTop(newScrollTop);
    
    // Auto-scroll toggle: if user scrolls up, disable auto-scroll. If they are at bottom, enable.
    const isAtBottom = scrollHeight - newScrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  const uniqueRunningPackages = useMemo(() => {
    const pkgs = new Set(Object.values(pidMap));
    return Array.from(pkgs).filter(Boolean).sort();
  }, [pidMap]);

  // Perform client-side filtering
  const filteredLogs = useMemo(() => {
    const minLevelIdx = LOG_LEVELS.indexOf(minLevel);
    
    return logs.filter(log => {
      // 1. Level filter
      const logIdx = LOG_LEVELS.indexOf(log.priority);
      if (logIdx < minLevelIdx) return false;

      // 2. Tag filter
      if (tagFilter) {
        try {
          const regex = new RegExp(tagFilter, 'i');
          if (!regex.test(log.tag)) return false;
        } catch {
          if (!log.tag.toLowerCase().includes(tagFilter.toLowerCase())) return false;
        }
      }

      // 3. PID filter
      if (pidFilter && String(log.pid) !== pidFilter.trim()) {
        return false;
      }

      // 4. Package Name filter
      if (packageNameFilter) {
        const procName = pidMap[log.pid];
        if (!procName || !procName.toLowerCase().includes(packageNameFilter.toLowerCase())) {
          return false;
        }
      }

      // 5. Message filter
      if (searchQuery) {
        try {
          const regex = new RegExp(searchQuery, 'i');
          if (!regex.test(log.message)) return false;
        } catch {
          if (!log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        }
      }

      return true;
    });
  }, [logs, minLevel, searchQuery, tagFilter, pidFilter, packageNameFilter, pidMap]);

  // Keep scroll at bottom if autoscroll is enabled
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  // Virtual list calculations
  const totalHeight = filteredLogs.length * ITEM_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 5);
  const endIndex = Math.min(filteredLogs.length, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + 5);

  const visibleLogs = useMemo(() => {
    return filteredLogs.slice(startIndex, endIndex).map((log, idx) => ({
      log,
      actualIndex: startIndex + idx
    }));
  }, [filteredLogs, startIndex, endIndex]);

  return (
    <div className="logcat-container">
      {/* Toolbar */}
      <div className="logcat-toolbar">
        {/* Play/Stop */}
        {isStreaming ? (
          <button onClick={stopStreaming} className="btn btn-danger" style={{ padding: '0.4rem 0.75rem' }}>
            <Square size={14} fill="currentColor" />
            {t('logcat.pause')}
          </button>
        ) : (
          <button onClick={startStreaming} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem' }} disabled={!deviceId}>
            <Play size={14} fill="currentColor" />
            {t('logcat.resume')}
          </button>
        )}

        {/* Clear & Export */}
        <button onClick={clearLogs} className="btn btn-secondary" style={{ padding: '0.4rem' }}>
          <Trash2 size={14} />
          {t('logcat.clear')}
        </button>
        <button onClick={handleExport} className="btn btn-secondary" style={{ padding: '0.4rem' }}>
          <Download size={14} />
          {t('logcat.export')}
        </button>

        {/* Auto Scroll Toggle */}
        <button 
          onClick={() => setAutoScroll(!autoScroll)} 
          className={`btn ${autoScroll ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem' }}
        >
          <Scroll size={14} />
          {t('logcat.auto_scroll')}
        </button>

        <div style={{ height: '20px', borderLeft: '1px solid var(--border)', margin: '0 0.25rem' }}></div>

        {/* Log Level Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('logcat.level')}:</span>
          <select 
            value={minLevel} 
            onChange={(e) => setMinLevel(e.target.value)}
            className="form-control"
            style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
          >
            {LOG_LEVELS.map(lvl => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>

        {/* PID Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PID:</span>
          <input 
            type="text" 
            placeholder={t('logcat.pid_placeholder')}
            value={pidFilter}
            onChange={(e) => setPidFilter(e.target.value)}
            className="form-control"
            style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
          />
        </div>

        {/* Package Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexGrow: 1, minWidth: '140px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pkg:</span>
          <input 
            type="text" 
            placeholder={t('logcat.package_placeholder')}
            value={packageNameFilter}
            onChange={(e) => setPackageNameFilter(e.target.value)}
            className="form-control"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            list="running-packages"
          />
          <datalist id="running-packages">
            {uniqueRunningPackages.map(pkg => (
              <option key={pkg} value={pkg} />
            ))}
          </datalist>
        </div>

        {/* Tag Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexGrow: 1, minWidth: '120px' }}>
          <Filter size={12} style={{ color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder={t('logcat.tag_placeholder')}
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="form-control"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
          />
        </div>

        {/* Search filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexGrow: 2, minWidth: '180px' }}>
          <Search size={12} style={{ color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder={t('logcat.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
          />
        </div>

        {/* Lines counter */}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filteredLogs.length} lines
        </span>
      </div>

      {/* Log list terminal */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="logcat-list-wrapper"
      >
        {!deviceId ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)'
          }}>
            Please select a device to view logs.
          </div>
        ) : (
          <div style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
            {visibleLogs.map(({ log, actualIndex }) => {
              const displayTime = log.time && log.time.includes(' ') ? log.time.split(/\s+/)[1] : log.time;
              return (
                <div 
                  key={actualIndex}
                  className="logcat-line"
                  style={{
                    position: 'absolute',
                    top: `${actualIndex * ITEM_HEIGHT}px`,
                    height: `${ITEM_HEIGHT}px`,
                    minWidth: '100%',
                    width: 'max-content'
                  }}
                  onDoubleClick={() => handleCopyLine(log)}
                  title="Double click to copy log line"
                >
                  <span className="logcat-col-time">{displayTime}</span>
                  <span className="logcat-col-pid-tid">{log.pid}/{log.tid}</span>
                  <span className={`logcat-col-level log-level-${log.priority}`}>{log.priority}</span>
                  <span className="logcat-col-tag" title={log.tag}>{log.tag}</span>
                  <span className={`logcat-col-msg log-${log.priority}`}>{log.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
