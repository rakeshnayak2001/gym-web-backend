import jwt from 'jsonwebtoken';
import { config } from '../lib/config.js';
import { HttpError } from '../lib/http.js';

export function signToken(user) {
  return jwt.sign({ userId: user._id.toString(), name: user.name, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Sign in to continue'));
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new HttpError(401, 'Your session has expired. Please sign in again.'));
  }
}
