let io = null;

function initSocket(httpServer) {
  const { Server } = require('socket.io');
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
    }
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {});
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = {
  initSocket,
  getIO
};
