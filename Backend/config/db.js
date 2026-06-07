const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use public DNS servers to resolve MongoDB Atlas SRV records
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (err) {
  console.warn('⚠️ Warning: Failed to set custom DNS servers:', err.message);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
