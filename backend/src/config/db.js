const mongoose = require('mongoose');
const dns = require('dns');

let memoryServer = null;

// Fix MongoDB Atlas SRV DNS resolution on some Windows networks
dns.setServers(['8.8.8.8']);

async function connectDB() {
  try {
    let uri = process.env.MONGODB_URI
      ? process.env.MONGODB_URI.trim()
      : '';

    if (!uri) {
      console.log(
        'ℹ️  MONGODB_URI not provided. Starting in-memory MongoDB instance for development/testing...'
      );

      const { MongoMemoryServer } = require('mongodb-memory-server');

      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();

      console.log(`✅ In-memory MongoDB started at: ${uri}`);
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);

    if (process.env.NODE_ENV !== 'production' && !memoryServer) {
      try {
        console.log('⚠️  Falling back to in-memory MongoDB...');

        const { MongoMemoryServer } = require('mongodb-memory-server');

        memoryServer = await MongoMemoryServer.create();

        const fallbackUri = memoryServer.getUri();

        const conn = await mongoose.connect(fallbackUri);

        console.log(
          `✅ MongoDB Connected (in-memory fallback): ${conn.connection.host}`
        );

        return conn;
      } catch (memErr) {
        console.error(
          `❌ In-memory MongoDB fallback failed: ${memErr.message}`
        );

        process.exit(1);
      }
    }

    process.exit(1);
  }
}

module.exports = connectDB;