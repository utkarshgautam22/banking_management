const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  // Professional logging
  console.error(`[${new Date().toISOString()}] ❌ ${req.method} ${req.path}:`, err.stack || err.message);

  // Postgres unique violation (e.g. duplicate email)
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate entry. A resource with these details already exists.' });
  }

  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Invalid reference. The related record was not found or is restricted.' });
  }

  // Postgres check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({ success: false, message: 'Invalid data format. Please verify your input and try again.' });
  }

  // Validation Error (from express-validator if caught in next(err))
  if (err.array) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: err.array() });
  }

  const statusCode = err.status || 500;
  const message = err.message || 'An unexpected server error occurred';

  res.status(statusCode).json({
    success: false,
    message: isDev ? message : 'Internal server error',
    ...(isDev && { stack: err.stack, details: err })
  });
};

module.exports = errorHandler;
