import { rateLimit, Options } from 'express-rate-limit';

import { ERROR_MESSAGES } from '../constants/messages';

// At most 10 counted requests per IP in 15 minutes, then 429.
// Counts are kept in memory, which works for one server (Render).
const shared: Partial<Options> = {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ message: ERROR_MESSAGES.TOO_MANY_REQUESTS });
  },
};

// Login: only failed attempts count, so normal users are never blocked.
export const loginLimiter = rateLimit({
  ...shared,
  skipSuccessfulRequests: true,
});

// Sign-up: every attempt counts, to slow down mass account creation.
export const signupLimiter = rateLimit(shared);
