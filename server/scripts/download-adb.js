const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const PLATFORM_TOOLS_DIR = path.join(BIN_DIR, 'platform-tools');

async function downloadAdb() {
  console.log('Checking ADB binary...');
  if (fs.existsSync(path.join(PLATFORM_TOOLS_DIR, 'adb.exe'))) {
    console.log('ADB binary already exists. Skipping download.');
    return;
  }

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  console.log('Downloading Windows Android Platform Tools (ADB)...');
  const zipPath = path.join(BIN_DIR, 'adb.zip');
  const tempExtractDir = path.join(BIN_DIR, 'temp-adb');

  try {
    // Download zip using PowerShell
    console.log('Downloading zip...');
    execSync(`powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri https://dl.google.com/android/repository/platform-tools-latest-windows.zip -OutFile '${zipPath}'"`, { stdio: 'inherit' });
    
    // Extract using PowerShell
    console.log('Extracting zip...');
    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempExtractDir, { recursive: true });
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempExtractDir}' -Force"`, { stdio: 'inherit' });

    // Move to bin/platform-tools
    console.log('Moving files to final destination...');
    if (fs.existsSync(PLATFORM_TOOLS_DIR)) {
      fs.rmSync(PLATFORM_TOOLS_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(PLATFORM_TOOLS_DIR, { recursive: true });

    const sourceDir = path.join(tempExtractDir, 'platform-tools');
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
      fs.renameSync(path.join(sourceDir, file), path.join(PLATFORM_TOOLS_DIR, file));
    }

    console.log('ADB successfully setup!');
  } catch (error) {
    console.error('Failed to download and setup ADB:', error);
  } finally {
    // Clean up files
    console.log('Cleaning up temporary files...');
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
  }
}

downloadAdb();
