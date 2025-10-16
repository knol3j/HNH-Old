/**
 * JWT authentication middleware.
 * Reads the secret from `process.env.JWT_SECRET`.
 * Returns 401 if the token is missing or invalid.
 */
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.warn('Invalid JWT:', err.message);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

