const mongoose = require('mongoose');

let mongoServer;

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    // If no external MongoDB is available, use in-memory MongoDB
    // This makes the project work out-of-the-box without MongoDB installation
    if (!uri || uri.includes('localhost') || uri.includes('127.0.0.1')) {
      try {
        // Try connecting to the provided URI first
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
        console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
        return;
      } catch {
        // If local MongoDB isn't available, fall back to in-memory
        console.log('⚠️  Local MongoDB not found. Starting in-memory MongoDB...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        console.log('✅ In-memory MongoDB started');
      }
    }

    await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB error: ${err.message}`);
});

// Graceful cleanup
const cleanupDB = async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
};

module.exports = { connectDB, cleanupDB };
