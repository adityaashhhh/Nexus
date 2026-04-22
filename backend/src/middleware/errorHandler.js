/**
 * Global error handling middleware.
 * Catches all errors and sends structured JSON responses.
 * Handles Mongoose-specific errors (validation, duplicate key, cast).
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging (in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    error.message = `Resource not found with id: ${err.value}`;
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `Duplicate value for field '${field}'. This ${field} already exists.`;
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error.message = messages.join('. ');
    return res.status(400).json({
      success: false,
      message: error.message,
      errors: messages,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired',
    });
  }

  // Default server error
  res.status(err.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
