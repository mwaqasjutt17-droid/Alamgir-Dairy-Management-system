const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route files
const authRoutes = require('./routes/auth');
const batchRoutes = require('./routes/batches');
const fleetRoutes = require('./routes/fleet');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// ============ DB CONNECTION (serverless-safe cached) ============
let isConnected = false;
async function connectIfNeeded() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
}
app.use(async (req, res, next) => {
  try { await connectIfNeeded(); next(); }
  catch (err) { next(err); }
});

// ============ SECURITY MIDDLEWARE ============
app.use(helmet());

// Rate limiting — 100 requests per 10 minutes per IP
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again after 10 minutes.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth/', authLimiter);

// ============ CORE MIDDLEWARE ============
// CORS — allow frontend to connect on any local dev port
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like file://, curl, or postman)
    if (!origin || origin === 'null') return callback(null, true);

    // matches http://localhost:PORT or http://127.0.0.1:PORT
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isVercel = origin.includes('vercel.app') || origin.includes('render.com');

    if (isLocal || isVercel) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Redefine req.query to be writable for Express 5 compatibility with express-mongo-sanitize
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true
    });
  }
  next();
});

// Sanitize data against MongoDB injection
app.use(mongoSanitize());

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static uploads
app.use('/uploads', express.static('uploads'));

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/settings', settingsRoutes);

// Health check — confirms backend is live
app.get('/', (req, res) => {
  res.json({ success: true, message: '🥛 Alamgir Dairy API is running.' });
});

// ============ GLOBAL ERROR HANDLER ============
app.use(errorHandler);

// ============ START SERVER (local only) ============
// When run directly (node server.js), start HTTP server.
// When imported by Vercel serverless, just export the app.
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
  process.on('unhandledRejection', (err) => {
    console.error(`❌ Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
}

module.exports = app;
