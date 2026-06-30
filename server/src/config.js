const path = require('path');
const fs = require('fs');

require('dotenv').config();

const PORT = process.env.PORT || 3000;

const isPkg = typeof process.pkg !== 'undefined';
const baseDir = isPkg 
  ? path.dirname(process.execPath) 
  : path.join(__dirname, '..');

const ADB_PATH = path.join(baseDir, 'bin', 'platform-tools', 'adb.exe');
const UPLOAD_DIR = path.join(baseDir, 'uploads');
const BOOKMARKS_FILE = path.join(baseDir, 'bookmarks.json');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Ensure bookmarks file exists
if (!fs.existsSync(BOOKMARKS_FILE)) {
  fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify([]));
}

module.exports = {
  PORT,
  ADB_PATH,
  UPLOAD_DIR,
  BOOKMARKS_FILE,
  NGROK_AUTHTOKEN: process.env.NGROK_AUTHTOKEN || ''
};
