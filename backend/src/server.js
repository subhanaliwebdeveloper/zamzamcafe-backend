require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedData = require('./utils/seedAdmin');

const http = require('http');
const { initSocket } = require('./utils/socket');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Seed default admin & initial products
    await seedData();

    // 3. Create HTTP server & initialize Socket.io
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    // 4. Start HTTP & Socket server
    const server = httpServer.listen(PORT, () => {
      console.log(`
🚀 ===============================================
   ZAM ZAM CAFE BACKEND SERVER STARTED
   Port: http://localhost:${PORT}
   API Base: http://localhost:${PORT}/api
   Health: http://localhost:${PORT}/api/health
   Real-Time: Socket.io Enabled
==================================================
      `);
    });

    return server;
  } catch (error) {
    console.error('Fatal Server Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
