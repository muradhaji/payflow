import { ErrorRequestHandler } from 'express';

import { ERROR_MESSAGES } from '../constants/messages';

// Last middleware: answers every error that reaches it, so the API keeps running.
// Client errors that already carry a 4xx status (e.g. invalid JSON) keep it.
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  // Two sign-ups with the same name at the same moment: both pass the
  // "username exists" check, and the unique index rejects the second one.
  if (err?.code === 11000 && err?.keyPattern?.username) {
    res.status(400).json({ message: ERROR_MESSAGES.AUTH.USERNAME_EXISTS });
    return;
  }

  const status =
    typeof err?.status === 'number' && err.status >= 400 && err.status < 500
      ? err.status
      : 500;

  if (status === 500) {
    console.error('Unhandled error:', err);
  }

  res.status(status).json({ message: ERROR_MESSAGES.UNKNOWN });
};
