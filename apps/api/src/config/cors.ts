import { CorsOptionsDelegate } from 'cors';
import { Request } from 'express';

// Which websites may call the API from a browser.
// CORS_ORIGINS: exact origins, comma-separated (e.g. https://payflow-live.vercel.app).
// CORS_ORIGIN_PATTERN: optional regex for preview deployments.
const DEFAULT_ORIGINS = ['http://localhost:5173'];

type CorsConfig = { origins: string[]; pattern: RegExp | null };
let config: CorsConfig | null = null;

// Read on first request, after dotenv has loaded .env.
const getConfig = (): CorsConfig => {
  if (!config) {
    const origins = (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    config = {
      origins: origins.length > 0 ? origins : DEFAULT_ORIGINS,
      pattern: process.env.CORS_ORIGIN_PATTERN
        ? new RegExp(process.env.CORS_ORIGIN_PATTERN)
        : null,
    };
  }
  return config;
};

const isAllowed = (origin: string, req: Request): boolean => {
  const { origins, pattern } = getConfig();
  return (
    origins.includes(origin) ||
    (pattern?.test(origin) ?? false) ||
    // The API's own pages (Swagger at /api-docs) call it from the same origin.
    origin === `${req.protocol}://${req.get('host')}`
  );
};

export const corsOptions: CorsOptionsDelegate<Request> = (req, callback) => {
  const origin = req.header('Origin');
  // Requests without an Origin header (curl, server-to-server) are not
  // browser cross-origin calls; CORS does not apply to them.
  callback(null, { origin: !origin || isAllowed(origin, req) });
};
