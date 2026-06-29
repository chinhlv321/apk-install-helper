const adbService = require('../services/adb.service');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);
    
    // Store devices this specific socket connection is streaming logs for
    const socketStreams = new Set();

    // Listen for logcat start request
    socket.on('logcat:start', ({ deviceId }) => {
      if (!deviceId) return;
      
      console.log(`Socket ${socket.id} requested logcat start for ${deviceId}`);
      socketStreams.add(deviceId);

      adbService.startLogcatStream(
        deviceId,
        // onLogEntry
        (entry) => {
          socket.emit('logcat:data', { deviceId, entry });
        },
        // onError
        (error) => {
          socket.emit('logcat:error', { deviceId, error });
        },
        // onClose
        (code) => {
          socket.emit('logcat:close', { deviceId, code });
          socketStreams.delete(deviceId);
        }
      );
    });

    // Listen for logcat stop request
    socket.on('logcat:stop', ({ deviceId }) => {
      if (!deviceId) return;
      console.log(`Socket ${socket.id} requested logcat stop for ${deviceId}`);
      adbService.stopLogcatStream(deviceId);
      socketStreams.delete(deviceId);
    });

    // Clean up all streams owned by this socket on disconnect
    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
      for (const deviceId of socketStreams) {
        console.log(`Cleaning up leaked logcat stream for device ${deviceId} due to socket disconnect`);
        adbService.stopLogcatStream(deviceId);
      }
      socketStreams.clear();
    });
  });
};
