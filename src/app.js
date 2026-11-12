import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { config } from './lib/config.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import programRoutes from './routes/programs.js';
import nutritionRoutes from './routes/nutrition.js';
import aiRoutes from './routes/ai.js';
import gymRoutes from './routes/gyms.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  const origins = config.corsOrigins;
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || origins.includes('*') || origins.includes(origin)),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );
  app.use(express.json({ limit: '8mb' }));

  const limiter = (limit, windowMs = 60_000) =>
    rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many requests, slow down a little.' } });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'up' : 'down' });
  });

  app.use('/api/auth', limiter(20, 15 * 60_000), authRoutes);
  app.use('/api/profile', requireAuth, profileRoutes);
  app.use('/api/programs', requireAuth, programRoutes);
  app.use('/api/nutrition', requireAuth, nutritionRoutes);
  app.use('/api/ai', requireAuth, limiter(20), aiRoutes);
  app.use('/api/gyms', requireAuth, limiter(15), gymRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
