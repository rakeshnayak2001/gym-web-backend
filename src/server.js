import { createApp } from './app.js';
import { connectDb } from './lib/db.js';
import { config } from './lib/config.js';

// Fail fast on missing secrets instead of at the first request.
void config.jwtSecret;

try {
  await connectDb();
  console.log('✓ MongoDB connected');
} catch (err) {
  console.error('✗ MongoDB connection failed:', err.message);
  process.exit(1);
}

const server = createApp().listen(config.port, () => {
  console.log(`✓ Kinetiq API listening on http://localhost:${config.port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
