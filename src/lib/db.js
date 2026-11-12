import mongoose from 'mongoose';
import { config } from './config.js';

// Cache the connection promise so serverless invocations reuse one socket.
let pending = null;

export function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!pending) {
    pending = mongoose
      .connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 })
      .then((m) => m.connection)
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}
