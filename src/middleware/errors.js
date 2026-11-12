import { HttpError } from '../lib/http.js';
import { config } from '../lib/config.js';

export function notFound(req, _res, next) {
  next(new HttpError(404, `No route for ${req.method} ${req.path}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, errors: err.details });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Upload is too large (max 8 MB).' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }
  if (err?.name === 'CastError') {
    return res.status(404).json({ message: 'Not found' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'That email is already registered' });
  }
  // Gemini SDK errors carry an HTTP-ish status.
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 600) {
    console.error('[upstream]', err.message);
    return res.status(err.status === 429 ? 429 : 502).json({
      message: err.status === 429 ? 'AI is busy right now — try again in a moment.' : 'AI service error. Please try again.',
    });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong', error: config.isProd ? undefined : err?.message });
}
