import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  api,
  createUser,
  deleteUser,
  TEST_PASSWORD,
  TestUser,
} from './helpers';

// The login and sign-up limits (US-AUTH-07): 10 counted requests per IP in
// 15 minutes, then 429. The counts live in memory and every test file gets
// its own app, so this file starts from zero; all its requests come from
// the same IP. Keep the request counts here exact.
const LIMIT = 10;

let user: TestUser;

beforeAll(async () => {
  user = await createUser(); // sign-up attempt 1 of 10
});

afterAll(async () => {
  await deleteUser(user);
});

describe('login limit', () => {
  const login = (password: string) =>
    api().post('/api/auth/login').send({ username: user.username, password });

  it('does not count successful logins', async () => {
    for (let i = 0; i < LIMIT + 2; i++) {
      expect((await login(TEST_PASSWORD)).status).toBe(200);
    }
  });

  it('answers 429 TOO_MANY_REQUESTS after 10 failed logins, even with the right password', async () => {
    for (let i = 0; i < LIMIT; i++) {
      expect((await login('Wrongpass123')).status).toBe(401);
    }

    const blocked = await login(TEST_PASSWORD);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ message: 'TOO_MANY_REQUESTS' });
    expect(blocked.headers['ratelimit-policy']).toBeDefined();
  });
});

describe('sign-up limit', () => {
  it('counts every attempt and answers 429 TOO_MANY_REQUESTS after 10', async () => {
    // Attempt 1 was the sign-up in beforeAll; invalid attempts count too.
    for (let i = 2; i <= LIMIT; i++) {
      const res = await api().post('/api/auth/signup').send({});
      expect(res.status).toBe(400);
    }

    const blocked = await api().post('/api/auth/signup').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ message: 'TOO_MANY_REQUESTS' });
  });

  it('does not limit other routes', async () => {
    const res = await api()
      .get('/api/installments')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
  });
});
