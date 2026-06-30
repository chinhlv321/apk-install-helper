const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');

const { PORT } = require('./config');
const deviceRoutes = require('./routes/device.routes');
const apkRoutes = require('./routes/apk.routes');
const tunnelRoutes = require('./routes/tunnel.routes');
const logcatSocket = require('./sockets/logcat.socket');
const adbService = require('./services/adb.service');

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

// Get local IP address(es)
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const k in interfaces) {
    for (const k2 in interfaces[k]) {
      const address = interfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
      }
    }
  }
  return addresses;
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

// Local IP endpoint so frontend knows the PC's LAN IP
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    localIps: getLocalIpAddresses(),
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
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`ADB Management Server running on port ${PORT}`);
  console.log(`Local Access: http://localhost:${PORT}`);
  
  const localIps = getLocalIpAddresses();
  if (localIps.length > 0) {
    console.log(`LAN Access urls:`);
    localIps.forEach(ip => {
      console.log(`  http://${ip}:${PORT}`);
    });
  }
  console.log(`=========================================`);

  // Auto connect paired wireless devices using mDNS
  setInterval(() => {
    adbService.autoConnectMdns().catch(() => {});
  }, 5000);
});
