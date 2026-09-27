const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const seedData = require('./utils/seedAdmin');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');

const app = express();

let dbInitialized = false;

// Initialize MongoDB only once
async function initializeDatabase() {
  if (dbInitialized) return;

  await connectDB();
  await seedData();

  dbInitialized = true;
}

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database initialization for Vercel/serverless requests
app.use(async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error('Database initialization failed:', error);

    res.status(500).json({
      error: 'Database connection failed'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Zam Zam Cafe API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/delivery-fee', deliveryRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  const status = err.status || 500;

  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;