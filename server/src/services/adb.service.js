const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ADB_PATH } = require('../config');

// Map to track active logcat processes by deviceId
const activeLogcats = new Map();

/**
 * Run a simple ADB command and return its stdout.
 */
function runAdbCommand(args) {
  return new Promise((resolve, reject) => {
    // Construct command line arguments
    const cmd = `"${ADB_PATH}" ${args.join(' ')}`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr.trim() || error.message, stdout: stdout.trim() });
      } else {
        resolve({ success: true, stdout: stdout.trim(), stderr: stderr.trim() });
      }
    });
  });
}

/**
 * Get list of connected devices.
 */
async function listDevices() {
  const res = await runAdbCommand(['devices', '-l']);
  if (!res.success) {
    return [];
  }

  const lines = res.stdout.split('\n');
  const devices = [];

  // Parse lines after "List of devices attached"
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Line format: "device_id   status   product:X model:Y device:Z transport_id:N"
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const id = parts[0];
      const status = parts[1]; // device, unauthorized, offline

      // Find details
      let model = 'Unknown';
      let product = 'Unknown';
      for (let j = 2; j < parts.length; j++) {
        if (parts[j].startsWith('model:')) {
          model = parts[j].substring(6).replace(/_/g, ' ');
        }
        if (parts[j].startsWith('product:')) {
          product = parts[j].substring(8).replace(/_/g, ' ');
        }
      }

      devices.push({ id, status, model, product, isWireless: id.includes(':') });
    }
  }

  return devices;
}

/**
 * Pair a device using adb pair.
 */
async function pairDevice(ip, port, code) {
  // adb pair ip:port code
  const res = await runAdbCommand(['pair', `${ip}:${port}`, code]);
  if (!res.success || res.stdout.includes('Failed') || res.stderr.includes('Failed')) {
    return { success: false, error: res.stdout || res.stderr || 'Pairing failed' };
  }
  return { success: true, message: res.stdout };
}

/**
 * Connect to device wirelessly using adb connect.
 */
async function connectWireless(ip, port) {
  // adb connect ip:port
  const res = await runAdbCommand(['connect', `${ip}:${port}`]);
  if (!res.success || res.stdout.includes('failed') || res.stdout.includes('unable')) {
    return { success: false, error: res.stdout || 'Connection failed' };
  }
  return { success: true, message: res.stdout };
}

/**
 * Disconnect a device.
 */
async function disconnectDevice(deviceId) {
  const res = await runAdbCommand(['disconnect', deviceId]);
  return res.success;
}

/**
 * Install an APK on a specific device.
 */
function installApk(deviceId, apkPath, onProgress) {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(apkPath)) {
      return resolve({ success: false, error: 'APK file not found on server' });
    }

    // Spawn adb -s <deviceId> install -r <apkPath>
    const process = spawn(ADB_PATH, ['-s', deviceId, 'install', '-r', apkPath]);
    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (onProgress) {
        // Parse progress if any (ADB might not give percentage directly but some output is helpful)
        onProgress(text.trim());
      }
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0 && (output.includes('Success') || !errorOutput)) {
        resolve({ success: true, message: 'Installation successful' });
      } else {
        resolve({ success: false, error: errorOutput.trim() || output.trim() || `Install process exited with code ${code}` });
      }
    });
  });
}

/**
 * Start streaming logcat for a specific device.
 */
function startLogcatStream(deviceId, onLogEntry, onError, onClose) {
  // If logcat already running for this device, stop it first
  stopLogcatStream(deviceId);

  console.log(`Starting logcat for device: ${deviceId}`);
  
  // Clear logcat buffer first to avoid massive dump of old logs
  exec(`"${ADB_PATH}" -s ${deviceId} logcat -c`, (err) => {
    if (err) console.error(`Failed to clear logcat buffer for ${deviceId}:`, err.message);

    // Spawn: adb -s <deviceId> logcat -v threadtime
    // -v threadtime includes: Date, Time, PID, TID, Priority, Tag, Message
    const adbProcess = spawn(ADB_PATH, ['-s', deviceId, 'logcat', '-v', 'threadtime']);
    activeLogcats.set(deviceId, adbProcess);

    let buffer = '';

    adbProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      // Keep last incomplete line in buffer
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const entry = parseLogcatLine(trimmed);
        if (entry) {
          onLogEntry(entry);
        }
      }
    });

    adbProcess.stderr.on('data', (data) => {
      const errText = data.toString().trim();
      if (errText) onError(errText);
    });

    adbProcess.on('close', (code) => {
      console.log(`Logcat process closed for ${deviceId} with code ${code}`);
      activeLogcats.delete(deviceId);
      if (onClose) onClose(code);
    });

    adbProcess.on('error', (err) => {
      console.error(`Logcat process error for ${deviceId}:`, err);
      if (onError) onError(err.message);
    });
  });
}

/**
 * Stop active logcat stream.
 */
function stopLogcatStream(deviceId) {
  if (activeLogcats.has(deviceId)) {
    console.log(`Stopping logcat stream for device: ${deviceId}`);
    const proc = activeLogcats.get(deviceId);
    proc.kill();
    activeLogcats.delete(deviceId);
    return true;
  }
  return false;
}

/**
 * Parse standard threadtime format:
 * "06-29 16:50:23.456  1000  2000 I MyTag   : This is log message text"
 * Returns: { time, pid, tid, priority, tag, message } or null if invalid.
 */
function parseLogcatLine(line) {
  // Regex pattern for "MM-DD HH:MM:SS.ms  PID  TID Priority Tag: Message"
  // Match groups:
  // 1: MM-DD HH:MM:SS.ms
  // 2: PID
  // 3: TID
  // 4: Priority (V, D, I, W, E, F)
  // 5: Tag
  // 6: Message
  const match = line.match(/^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+(.*?)\s*:\s?(.*)$/);
  if (!match) {
    // If it doesn't match standard format, return as verbose log message
    return {
      time: new Date().toLocaleTimeString(),
      pid: '-',
      tid: '-',
      priority: 'I',
      tag: 'System',
      message: line
    };
  }

  return {
    time: match[1],
    pid: parseInt(match[2]),
    tid: parseInt(match[3]),
    priority: match[4],
    tag: match[5].trim(),
    message: match[6]
  };
}

/**
 * Run adb mdns services, parse IPs and ports, and auto connect to them if not connected.
 */
async function autoConnectMdns() {
  const res = await runAdbCommand(['mdns', 'services']);
  if (!res.success) return;

  // Find all matches for "ip:port" in mdns output
  const lines = res.stdout.split('\n');
  const discovered = [];
  
  for (const line of lines) {
    // Regex to match ipv4:port
    const match = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)/);
    if (match) {
      discovered.push({ ip: match[1], port: parseInt(match[2]) });
    }
  }

  if (discovered.length === 0) return;

  // Get current connected devices list
  const currentDevices = await listDevices();
  const connectedIps = currentDevices.map(d => d.id.split(':')[0]);

  // For each discovered device, if its IP is not currently connected, try to run adb connect
  for (const dev of discovered) {
    if (!connectedIps.includes(dev.ip)) {
      console.log(`[MDNS] Auto-connecting to discovered wireless device: ${dev.ip}:${dev.port}`);
      await connectWireless(dev.ip, dev.port);
    }
  }
}

const crypto = require('crypto');
const BonjourLib = require('bonjour-service');

let activePairingSession = null;

/**
 * Start native ADB QR pairing session
 */
function startNativeQrPairing(io) {
  // Cancel any existing session
  cancelNativeQrPairing();

  const serviceName = 'studio-' + crypto.randomBytes(4).toString('hex');
  const password = crypto.randomInt(100000, 1000000).toString();
  const qrPayload = `WIFI:T:ADB;S:${serviceName};P:${password};;`;

  const session = {
    serviceName,
    password,
    bonjour: null,
    browser: null,
    isCancelled: false,
    intervalId: null,
    timeoutId: null
  };

  activePairingSession = session;

  const emitStatus = (status, details = {}) => {
    if (session.isCancelled) return;
    io.emit('pair:status', { status, serviceName, ...details });
  };

  emitStatus('waiting', { message: 'Đang chờ thiết bị quét mã QR...' });

  const timeoutMs = 60000;

  // 1. Bonjour discovery
  try {
    const bonjour = new BonjourLib.Bonjour();
    session.bonjour = bonjour;
    const browser = bonjour.find({ type: 'adb-tls-pairing', protocol: 'tcp' });
    session.browser = browser;

    browser.on('up', async (svc) => {
      if (session.isCancelled) return;

      const isMatch = svc.name === serviceName || 
                      svc.name.includes(serviceName) || 
                      (svc.fqdn && svc.fqdn.includes(serviceName));

      if (!isMatch) return;

      // Extract IP address
      const ip = (svc.addresses || []).find(a => /^\d{1,3}(\.\d{1,3}){3}$/.test(a)) || svc.referer?.address;
      if (ip && svc.port) {
        await handleDeviceDiscovered(ip, svc.port);
      }
    });
  } catch (err) {
    console.error('[Pairing] Bonjour startup error:', err);
  }

  // 2. ADB mdns services fallback discovery (polling)
  let startTime = Date.now();
  session.intervalId = setInterval(async () => {
    if (session.isCancelled) return;
    if (Date.now() - startTime > timeoutMs) {
      handleTimeout();
      return;
    }

    try {
      const res = await runAdbCommand(['mdns', 'services']);
      if (!res.success) return;

      for (const line of res.stdout.split('\n')) {
        if (!line.includes('adb-tls-pairing')) continue;
        if (!line.includes(serviceName)) continue;

        const match = line.match(/(\d{1,3}(?:\.\d{1,3}){3})[\t :]+(\d+)/);
        if (match) {
          await handleDeviceDiscovered(match[1], match[2]);
          return;
        }
      }
    } catch (err) {
      // Ignore transient errors
    }
  }, 1500);

  // 3. Timeout handler
  session.timeoutId = setTimeout(() => {
    handleTimeout();
  }, timeoutMs);

  async function handleDeviceDiscovered(ip, port) {
    if (session.isCancelled) return;
    cleanupSession();

    emitStatus('discovered', { ip, port, message: `Đã nhận diện thiết bị qua mDNS tại ${ip}:${port}` });
    emitStatus('pairing', { ip, port, message: 'Đang tiến hành ghép đôi (adb pair)...' });
    
    const pairRes = await runAdbCommand(['pair', `${ip}:${port}`, password]);
    if (!pairRes.success || pairRes.stdout.includes('Failed') || pairRes.stderr.includes('Failed')) {
      emitStatus('error', { error: pairRes.stdout || pairRes.stderr || 'Ghép đôi thất bại.' });
      return;
    }

    emitStatus('paired', { ip, message: 'Ghép đôi thành công! Đang quét cổng kết nối...' });
    emitStatus('connecting', { ip, message: 'Đang kết nối thiết bị...' });

    const connectPort = await autoDiscoverConnectPort(ip, 12000);
    if (connectPort) {
      const connectRes = await runAdbCommand(['connect', `${ip}:${connectPort}`]);
      if (connectRes.success && !connectRes.stdout.includes('failed') && !connectRes.stdout.includes('unable')) {
        emitStatus('success', { ip, port: connectPort, message: 'Kết nối thành công!' });
      } else {
        emitStatus('error', { error: `Ghép đôi thành công nhưng kết nối thất bại: ${connectRes.stdout}` });
      }
    } else {
      emitStatus('error', { error: 'Không tìm thấy cổng kết nối tự động. Vui lòng kết nối thủ công.' });
    }
  }

  function handleTimeout() {
    if (session.isCancelled) return;
    cleanupSession();
    emitStatus('error', { error: 'Hết thời gian chờ. Đảm bảo thiết bị kết nối cùng Wi-Fi và quét đúng mã.' });
  }

  function cleanupSession() {
    session.isCancelled = true;
    if (session.timeoutId) clearTimeout(session.timeoutId);
    if (session.intervalId) clearInterval(session.intervalId);
    if (session.browser) {
      try { session.browser.stop(); } catch (e) {}
    }
    if (session.bonjour) {
      try { session.bonjour.destroy(); } catch (e) {}
    }
  }

  return { serviceName, password, qrPayload };
}

/**
 * Cancel the current pairing session
 */
function cancelNativeQrPairing() {
  if (activePairingSession) {
    activePairingSession.isCancelled = true;
    if (activePairingSession.timeoutId) clearTimeout(activePairingSession.timeoutId);
    if (activePairingSession.intervalId) clearInterval(activePairingSession.intervalId);
    if (activePairingSession.browser) {
      try { activePairingSession.browser.stop(); } catch (e) {}
    }
    if (activePairingSession.bonjour) {
      try { activePairingSession.bonjour.destroy(); } catch (e) {}
    }
    activePairingSession = null;
  }
}

/**
 * Helper to discover connect port
 */
async function autoDiscoverConnectPort(ip, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await runAdbCommand(['mdns', 'services']);
      if (res.success) {
        for (const line of res.stdout.split('\n')) {
          if (!line.includes('adb-tls-connect')) continue;
          const match = line.match(/(\d{1,3}(?:\.\d{1,3}){3})[\t :]+(\d+)/);
          if (match && match[1] === ip) {
            return match[2];
          }
        }
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1500));
  }
  return null;
}

module.exports = {
  listDevices,
  pairDevice,
  connectWireless,
  disconnectDevice,
  installApk,
  startLogcatStream,
  stopLogcatStream,
  autoConnectMdns,
  startNativeQrPairing,
  cancelNativeQrPairing
};
