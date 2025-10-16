/**
 * Helper to build a consistent error JSON payload.
 *
 * @param {number} statusCode HTTP status code to return
 * @param {string} message Human‑readable error description
 * @param {any} [details] Optional additional details (e.g. stack trace in dev)
 * @returns {object} Standard error shape used throughout the API
 */
module.exports = (statusCode, message, details) => {
  const payload = {
    success: false,
    error: message
  };
  // Include optional details only when provided and not in production
  if (details && process.env.NODE_ENV !== 'production') {
    payload.details = details;
  }
  return payload;
};

