import express from 'express';
import cors from 'cors';
import sessionRoutes from './routes/session.routes.js';
import passageRoutes from './routes/passage.routes.js';
import actionRoutes from './routes/action.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { createError } from './utils/errors.js';

const app = express();

// Global Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'viveka-backend' });
});

// API v1 Routes
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/passages', passageRoutes);
app.use('/api/v1/actions', actionRoutes);

// Catch-all 404 handler
app.use((req, res, next) => {
  next(createError.invalidRequest(`Route ${req.method} ${req.originalUrl} not found`));
});

// Global Error Handler Middleware
app.use(errorMiddleware);

export default app;
