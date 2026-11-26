import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { User } from '../src/models/user.model';
import { api, TEST_PASSWORD, uniqueUsername } from './helpers';

// The checks from spec 002 "Done when" that are not covered elsewhere:
// bad input never stops the API, CORS allows only PayFlow's own sites,
// and every response carries the security headers.

// Use the production CORS settings from render.yaml, so these tests fail
// if that file changes in a way that locks out the live site. The API reads
// them on its first request, so they are set before any request is sent.
function renderValue(key: string): string {
  const yaml = readFileSync(
    path.resolve(__dirname, '../../../render.yaml'),
    'utf8'
  );
  const match = yaml.match(new RegExp(`key: ${key}\\n\\s+value: '(.+)'`));
  if (!match) throw new Error(`${key} not found in render.yaml`);
  return match[1];
}
process.env.CORS_ORIGINS = renderValue('CORS_ORIGINS');
process.env.CORS_ORIGIN_PATTERN = renderValue('CORS_ORIGIN_PATTERN');

describe('bad input does not stop the API', () => {
  beforeAll(() => {
    // The error handler logs unexpected errors; keep the output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('answers 400 UNKNOWN for a body that is not valid JSON, and keeps running', async () => {
    const res = await api()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"username": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'UNKNOWN' });

    expect((await api().get('/')).status).toBe(200);
  });

  it('answers one 201 and one 400 USERNAME_EXISTS for two sign-ups with the same name at once', async () => {
    const username = uniqueUsername();
    const body = { username, password: TEST_PASSWORD };
    try {
      const results = await Promise.all([
        api().post('/api/auth/signup').send(body),
        api().post('/api/auth/signup').send(body),
      ]);

      expect(results.map((res) => res.status).sort()).toEqual([201, 400]);
      const rejected = results.find((res) => res.status === 400)!;
      expect(rejected.body).toEqual({ message: 'USERNAME_EXISTS' });
      expect(await User.countDocuments({ username })).toBe(1);
    } finally {
      await User.deleteMany({ username });
    }
  });
});

describe('CORS with the production settings', () => {
  const preflight = (origin: string) =>
    api()
      .options('/api/auth/login')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST');

  it.each([
    ['the live site', 'https://payflow-live.vercel.app'],
    [
      'a preview deployment',
      'https://payflow-9rwxh4f62-murads-projects-644222af.vercel.app',
    ],
    [
      'a branch preview',
      'https://payflow-git-main-murads-projects-644222af.vercel.app',
    ],
  ])('allows %s', async (_case, origin) => {
    const res = await preflight(origin);
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });

  it.each([
    ['an unknown site', 'https://example.com'],
    ['a look-alike domain', 'https://payflow-live.vercel.app.evil.com'],
    ["another team's preview", 'https://payflow-abc123-other-team.vercel.app'],
    ['the live site over http', 'http://payflow-live.vercel.app'],
    [
      'localhost (production allows it only via CORS_ORIGINS)',
      'http://localhost:5173',
    ],
  ])('gives no CORS permission to %s', async (_case, origin) => {
    const res = await preflight(origin);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it("allows the API's own pages (Swagger at /api-docs)", async () => {
    const res = await api()
      .get('/api/installments')
      .set('Host', 'api.payflow.test')
      .set('Origin', 'http://api.payflow.test');
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://api.payflow.test'
    );
  });

  it('answers requests without an Origin (curl, servers) as usual', async () => {
    const res = await api().get('/');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('security headers', () => {
  it.each([
    ['the API', '/'],
    ['the Swagger page', '/api-docs/'],
  ])('are on %s, and X-Powered-By is not', async (_case, url) => {
    const res = await api().get(url);
    expect(res.status).toBe(200);
    expect(res.headers).toMatchObject({
      'content-security-policy': expect.any(String),
      'strict-transport-security': expect.stringContaining('max-age='),
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'referrer-policy': 'no-referrer',
    });
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
