require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const app = express();
const PORT = process.env.API_PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'HashNHedge API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      community: {
        register: 'POST /api/community/register',
        profile: 'GET /api/community/profile/:id',
        update: 'PUT /api/community/profile/:id',
        list: 'GET /api/community/members'
      },
      vendor: {
        register: 'POST /api/vendor/register',
        profile: 'GET /api/vendor/profile/:id',
        update: 'PUT /api/vendor/profile/:id',
        list: 'GET /api/vendor/list',
        addOffering: 'POST /api/vendor/:vendorId/offering'
      },
      worker: {
        register: 'POST /api/worker/register',
        heartbeat: 'POST /api/worker/:workerId/heartbeat',
        stats: 'GET /api/worker/:workerId/stats',
        jobs: 'GET /api/worker/:workerId/jobs',
        claimJob: 'POST /api/worker/:workerId/jobs/:jobId/claim',
        submitShare: 'POST /api/worker/:workerId/shares',
        list: 'GET /api/workers'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           HashNHedge API Server                          ║
║           Running on port ${PORT}                             ║
║                                                           ║
║   Community Registration: /api/community/register        ║
║   Vendor Registration: /api/vendor/register              ║
║   Worker Registration: /api/worker/register              ║
║                                                           ║
║   Health Check: /api/health                              ║
║   API Docs: http://localhost:${PORT}/                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
