const path = require('path');
const fs = require('fs');

require('dotenv').config();

const PORT = process.env.PORT || 3000;
const ADB_PATH = path.join(__dirname, '..', 'bin', 'platform-tools', 'adb.exe');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const BOOKMARKS_FILE = path.join(__dirname, '..', 'bookmarks.json');

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
