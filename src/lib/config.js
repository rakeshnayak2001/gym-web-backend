const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
};

export const config = {
  get port() { return Number(process.env.PORT) || 8000; },
  get isProd() { return process.env.NODE_ENV === 'production'; },
  get mongoUri() { return required('MONGO_URI'); },
  get jwtSecret() { return required('JWT_SECRET'); },
  get jwtExpiresIn() { return process.env.JWT_EXPIRES_IN || '7d'; },
  // Unset = allow any origin. Safe here because auth uses bearer tokens, not cookies.
  // Set CORS_ORIGINS (comma-separated) to lock it down.
  get corsOrigins() {
    return (process.env.CORS_ORIGINS || '*')
      .split(',').map((o) => o.trim()).filter(Boolean);
  },
  get geminiKey() { return process.env.GEMINI_API_KEY || ''; },
  get geminiModel() { return process.env.GEMINI_MODEL || 'gemini-flash-latest'; },
};
