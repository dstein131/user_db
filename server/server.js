// server.js

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const userRoutes = require('./routes');

const app = express();
const PORT = 3000;

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Use the routes from routes.js
app.use('/', userRoutes);

// Operational error handling middleware
app.use((err, req, res, next) => {
  if (err.isOperational) {
    res.status(err.statusCode).send({
      status: 'error',
      message: err.message
    });
  } else {
    console.error('ERROR 💥', err);
    res.status(500).send({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
});

// Handle unhandled promise rejections & uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'Reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
