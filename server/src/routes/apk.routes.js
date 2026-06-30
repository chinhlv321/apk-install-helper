const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adbService = require('../services/adb.service');
const { UPLOAD_DIR } = require('../config');
const ApkReader = require('adbkit-apkreader');

// Cache configuration for APK manifest details
const CACHE_FILE = path.join(UPLOAD_DIR, 'apk-cache.json');
let manifestCache = {};

if (fs.existsSync(CACHE_FILE)) {
  try {
    manifestCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    
    // Clean up cache for files that no longer exist
    let cacheChanged = false;
    for (const filename in manifestCache) {
      const filePath = path.join(UPLOAD_DIR, filename);
      if (!fs.existsSync(filePath)) {
        delete manifestCache[filename];
        cacheChanged = true;
      }
    }
    if (cacheChanged) {
      try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(manifestCache, null, 2), 'utf8');
      } catch (err) {
        console.error('Failed to clean APK cache file:', err);
      }
    }
  } catch (err) {
    console.error('Failed to parse APK manifest cache file:', err);
    manifestCache = {};
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(manifestCache, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write APK manifest cache file:', err);
  }
}

async function getApkManifest(filename, filePath) {
  if (manifestCache[filename]) {
    return manifestCache[filename];
  }

  try {
    const reader = await ApkReader.open(filePath);
    const manifest = await reader.readManifest();
    const info = {
      packageName: manifest.package || 'Unknown',
      versionName: manifest.versionName || 'Unknown',
      versionCode: manifest.versionCode || 'Unknown'
    };
    manifestCache[filename] = info;
    saveCache();
    return info;
  } catch (err) {
    console.error(`Failed to parse APK manifest for ${filename}:`, err);
    return {
      packageName: 'Unknown',
      versionName: 'Unknown',
      versionCode: 'Unknown'
    };
  }
}

// Setup Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Keep file name safe but readable
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit as discussed
});

// Upload APK endpoint
router.post('/upload', upload.single('apk'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const manifestInfo = await getApkManifest(req.file.filename, req.file.path);
    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path,
        packageName: manifestInfo.packageName,
        versionName: manifestInfo.versionName,
        versionCode: manifestInfo.versionCode
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List uploaded APKs
router.get('/list', async (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    const apkFiles = files.filter(file => file.endsWith('.apk'));

    const apks = [];
    for (const file of apkFiles) {
      const filePath = path.join(UPLOAD_DIR, file);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) continue;
      
      const stat = fs.statSync(filePath);
      const match = file.match(/^\d+-\d+-(.+)$/);
      const originalName = match ? match[1] : file;

      const manifestInfo = await getApkManifest(file, filePath);

      apks.push({
        filename: file,
        originalName,
        size: stat.size,
        createdAt: stat.birthtime,
        packageName: manifestInfo.packageName,
        versionName: manifestInfo.versionName,
        versionCode: manifestInfo.versionCode
      });
    }

    apks.sort((a, b) => b.createdAt - a.createdAt); // Sort latest first

    res.json({ success: true, apks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to parse adb install progress
function parseProgress(text) {
  const pctMatch = text.match(/\[\s*(\d+)%\]/);
  if (pctMatch) {
    const percent = parseInt(pctMatch[1], 10);
    return {
      progress: percent,
      message: `Pushing to device: ${percent}%`
    };
  }

  if (text.includes('Performing Streamed Install') || text.includes('Streaming install')) {
    return {
      progress: 95,
      message: 'Installing on device...'
    };
  }

  if (text.includes('Success')) {
    return {
      progress: 100,
      message: 'Installation successful'
    };
  }

  if (text.includes('Failure') || text.toLowerCase().includes('failed')) {
    return {
      progress: -1,
      message: text
    };
  }

  return {
    progress: null,
    message: text
  };
}

// Install APK on device via ADB
router.post('/install', async (req, res) => {
  const { deviceId, filename } = req.body;
  if (!deviceId || !filename) {
    return res.status(400).json({ success: false, error: 'Device ID and Filename are required' });
  }

  const apkPath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(apkPath)) {
    return res.status(404).json({ success: false, error: 'APK file not found on server' });
  }

  try {
    const result = await adbService.installApk(deviceId, apkPath, (progressText) => {
      if (req.io) {
        const lines = progressText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const parsed = parseProgress(trimmed);
          req.io.emit('apk:install-progress', {
            deviceId,
            filename,
            progress: parsed.progress,
            message: parsed.message
          });
        }
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download APK (served publicly for QR code fallback)
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const apkPath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(apkPath)) {
    return res.status(404).send('APK file not found');
  }

  // Set header to trigger download
  // Try to extract original file name
  const match = filename.match(/^\d+-\d+-(.+)$/);
  const originalName = match ? match[1] : filename;

  res.download(apkPath, originalName);
});

module.exports = router;
