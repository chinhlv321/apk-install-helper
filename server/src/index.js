const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');

const { PORT } = require('./config');
const isPkg = typeof process.pkg !== 'undefined';
const deviceRoutes = require('./routes/device.routes');
const apkRoutes = require('./routes/apk.routes');
const tunnelRoutes = require('./routes/tunnel.routes');
const logcatSocket = require('./sockets/logcat.socket');
const adbService = require('./services/adb.service');
const downloadAdb = require('../scripts/download-adb');

const app = express();
const server = http.createServer(app);

// Setup Socket.io earlier so we can share it with HTTP routes
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware to expose io to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Get local IP address(es) and detect Tailscale IP
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const lanIps = [];
  let tailscaleIp = null;

  for (const k in interfaces) {
    for (const address of interfaces[k]) {
      if (address.family === 'IPv4' && !address.internal) {
        const ip = address.address;
        
        // Detect Tailscale IP: falls in CGNAT subnet 100.64.0.0/10 (starts with 100.64 to 100.127)
        const parts = ip.split('.');
        const first = parseInt(parts[0]);
        const second = parseInt(parts[1]);
        if (first === 100 && second >= 64 && second <= 127) {
          tailscaleIp = ip;
        } else {
          lanIps.push(ip);
        }
      }
    }
  }
  return { lanIps, tailscaleIp };
}

// Config CORS
app.use(cors({
  origin: '*', // Allow connection from Vite dev server and client
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static guide/download pages
app.use(express.static(path.join(__dirname, 'public')));
app.get('/connect-guide', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'connect-guide.html'));
});
app.get('/pair-mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pair-mobile.html'));
});
app.get('/download', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'download.html'));
});

// Mount routes
app.use('/api/devices', deviceRoutes);
app.use('/api/apk', apkRoutes);
app.use('/api/tunnel', tunnelRoutes);

// Local network details endpoint
app.get('/api/info', (req, res) => {
  const { lanIps, tailscaleIp } = getLocalIpAddresses();
  res.json({
    success: true,
    localIps: lanIps,
    tailscaleIp: tailscaleIp,
    port: PORT
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Wire sockets
logcatSocket(io);

// Start Server
async function startApp() {
  // Ensure ADB is setup before listening
  try {
    await downloadAdb();
  } catch (err) {
    console.error('Failed to initialize ADB Platform Tools:', err.message);
  }

  let portToUse = PORT;
  
  const startServer = (port) => {
    server.listen(port, () => {
      const actualPort = server.address().port;
      console.log(`=========================================`);
      console.log(`ADB Management Server running on port ${actualPort}`);
      console.log(`Local Access: http://localhost:${actualPort}`);
      
      const { lanIps, tailscaleIp } = getLocalIpAddresses();
      if (lanIps.length > 0) {
        console.log(`LAN Access urls:`);
        lanIps.forEach(ip => {
          console.log(`  http://${ip}:${actualPort}`);
        });
      }
      
      if (tailscaleIp) {
        console.log(`Tailscale Access url:`);
        console.log(`  http://${tailscaleIp}:${actualPort}`);
      }
      
      console.log(`=========================================`);

      // Auto open browser if packaged
      if (isPkg) {
        const { exec } = require('child_process');
        const url = `http://localhost:${actualPort}`;
        const startCmd = process.platform === 'darwin' ? 'open' :
                         process.platform === 'win32' ? 'start ""' : 'xdg-open';
        exec(`${startCmd} "${url}"`);
      }

      // Auto connect paired wireless devices using mDNS
      setInterval(() => {
        adbService.autoConnectMdns().catch(() => {});
      }, 5000);
    });
  };

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToUse} is in use, trying next port...`);
      portToUse++;
      startServer(portToUse);
    } else {
      console.error('Server error:', err.message);
    }
  });

  startServer(portToUse);
}

startApp();
