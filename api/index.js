// Vercel serverless entry: every request is rewritten here (see vercel.json).
import { createApp } from '../src/app.js';
import { connectDb } from '../src/lib/db.js';

const app = createApp();

export default async function handler(req, res) {
  await connectDb();
  return app(req, res);
}
