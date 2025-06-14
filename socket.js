// Socket.io setup for real-time updates
let io;

module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer, {
      cors: {
        origin: '*', // In production, restrict this to your frontend URL
        methods: ['GET', 'POST']
      }
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      console.log('Socket.io not initialized!');
      return null;
    }
    return io;
  }
};