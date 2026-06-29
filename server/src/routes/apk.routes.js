const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adbService = require('../services/adb.service');
const { UPLOAD_DIR } = require('../config');

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
router.post('/upload', upload.single('apk'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    }
  });
});

// List uploaded APKs
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    const apks = files.map(file => {
      const filePath = path.join(UPLOAD_DIR, file);
      const stat = fs.statSync(filePath);
      // Parse original name from generated name: <timestamp>-<random>-<originalName>
      const match = file.match(/^\d+-\d+-(.+)$/);
      const originalName = match ? match[1] : file;

      return {
        filename: file,
        originalName,
        size: stat.size,
        createdAt: stat.birthtime
      };
    }).sort((a, b) => b.createdAt - a.createdAt); // Sort latest first

    res.json({ success: true, apks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
    const result = await adbService.installApk(deviceId, apkPath);
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
