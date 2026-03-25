import rateLimit from 'express-rate-limit';

export const batchRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 batch par IP toutes les 15 minutes
  message: {
    error: 'Trop de requêtes, réessaie dans 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // max 100 requêtes par minute par IP
  message: {
    error: 'Trop de requêtes, réessaie dans 1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});