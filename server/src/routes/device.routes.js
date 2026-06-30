const express = require('express');
const router = express.Router();
const fs = require('fs');
const adbService = require('../services/adb.service');
const { BOOKMARKS_FILE } = require('../config');

// Helper to read bookmarks
function getBookmarks() {
  try {
    const data = fs.readFileSync(BOOKMARKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper to write bookmarks
function saveBookmarks(bookmarks) {
  fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));
}

// Get client IP address
router.get('/my-ip', (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  if (ip === '::1') {
    ip = '127.0.0.1';
  }
  res.json({ success: true, ip });
});

// List all connected devices
router.get('/', async (req, res) => {
  try {
    const devices = await adbService.listDevices();
    res.json({ success: true, devices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Pair device wirelessly
router.post('/pair', async (req, res) => {
  const { ip, port, code } = req.body;
  if (!ip || !port || !code) {
    return res.status(400).json({ success: false, error: 'IP, Port, and Pairing Code are required' });
  }

  try {
    const result = await adbService.pairDevice(ip, port, code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Connect wireless device
router.post('/connect', async (req, res) => {
  const { ip, port } = req.body;
  if (!ip || !port) {
    return res.status(400).json({ success: false, error: 'IP and Port are required' });
  }

  try {
    const result = await adbService.connectWireless(ip, port);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Disconnect device
router.post('/disconnect', async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'Device ID is required' });
  }

  try {
    const success = await adbService.disconnectDevice(deviceId);
    res.json({ success, message: success ? 'Device disconnected' : 'Failed to disconnect device' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get bookmarked devices
router.get('/saved', (req, res) => {
  res.json({ success: true, bookmarks: getBookmarks() });
});

// Save bookmark device
router.post('/save', async (req, res) => {
  const { ip, port, name } = req.body;
  if (!ip || !port) {
    return res.status(400).json({ success: false, error: 'IP and Port are required' });
  }

  const bookmarks = getBookmarks();
  const id = `${ip}:${port}`;
  
  // Try to find the device name automatically if not provided or equals to id
  let displayName = name;
  if (!displayName || displayName === id) {
    try {
      const devices = await adbService.listDevices();
      const connectedDevice = devices.find(d => d.id === id || d.id.startsWith(ip + ':'));
      if (connectedDevice && connectedDevice.model && connectedDevice.model !== 'Unknown') {
        displayName = connectedDevice.model;
      }
    } catch (err) {
      console.error('Failed to auto-detect device model for bookmark:', err);
    }
  }
  
  if (!displayName) {
    displayName = id;
  }

  // Check if already exists
  const exists = bookmarks.find(b => b.id === id);
  if (exists) {
    exists.name = name || displayName;
  } else {
    bookmarks.push({ id, ip, port, name: displayName });
  }

  saveBookmarks(bookmarks);
  res.json({ success: true, bookmarks });
});

// Remove bookmark
router.delete('/saved/:id', (req, res) => {
  const { id } = req.params;
  let bookmarks = getBookmarks();
  bookmarks = bookmarks.filter(b => b.id !== id);
  saveBookmarks(bookmarks);
  res.json({ success: true, bookmarks });
});

// Start native QR pairing session
router.post('/pair-qr/start', (req, res) => {
  try {
    const sessionData = adbService.startNativeQrPairing(req.io);
    res.json({ success: true, ...sessionData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel active native QR pairing session
router.post('/pair-qr/cancel', (req, res) => {
  try {
    adbService.cancelNativeQrPairing();
    res.json({ success: true, message: 'QR Pairing cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get processes of a device
router.get('/:deviceId/processes', async (req, res) => {
  const { deviceId } = req.params;
  try {
    const processes = await adbService.getProcessList(deviceId);
    res.json({ success: true, processes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get third-party packages of a device
router.get('/:deviceId/third-party-packages', async (req, res) => {
  const { deviceId } = req.params;
  try {
    const packages = await adbService.getThirdPartyPackages(deviceId);
    res.json({ success: true, packages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
