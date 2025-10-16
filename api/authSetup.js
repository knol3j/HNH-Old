/**
 * Attach JWT authentication to all worker routes.
 * Imported and invoked from `api/server.js`.
 */
module.exports = (app) => {
  const auth = require('./middleware/auth');
  // Protect any endpoint under /api/worker/*
  app.use('/api/worker', auth);
};

