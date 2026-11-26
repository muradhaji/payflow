import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  api,
  createUser,
  deleteUser,
  TEST_PASSWORD,
  TestUser,
  uniqueUsername,
} from './helpers';

// POST /api/auth/login. The login limit counts only failed attempts
// (10 per file), so this file has fewer than 10 failing requests.
describe('POST /api/auth/login', () => {
  const login = (body: object) => api().post('/api/auth/login').send(body);
  let user: TestUser;

  beforeAll(async () => {
    user = await createUser();
  });

  afterAll(async () => {
    await deleteUser(user);
  });

  it('answers 200 with id, username and a working token', async () => {
    const res = await login({
      username: user.username,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      _id: user._id,
      username: user.username,
      token: expect.any(String),
    });

    const list = await api()
      .get('/api/installments')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(list.status).toBe(200);
  });

  it('answers the same 401 INVALID_CREDENTIALS for a wrong password and an unknown user', async () => {
    const wrongPassword = await login({
      username: user.username,
      password: 'Wrongpass123',
    });
    const unknownUser = await login({
      username: uniqueUsername(),
      password: TEST_PASSWORD,
    });

    for (const res of [wrongPassword, unknownUser]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'INVALID_CREDENTIALS' });
    }
  });

  it.each([
    ['no body at all', undefined, 'USERNAME_REQUIRED'],
    [
      'username as an object',
      { username: { $ne: '' }, password: TEST_PASSWORD },
      'USERNAME_INVALID',
    ],
  ])('answers 400 for %s', async (_case, body, message) => {
    const res = await api().post('/api/auth/login').send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message });
  });

  it.each([
    ['no password', undefined, 'PASSWORD_REQUIRED'],
    ['password as an array', ['Testpass123'], 'PASSWORD_INVALID'],
  ])(
    'answers 400 for an existing user with %s',
    async (_case, password, message) => {
      const res = await login({ username: user.username, password });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message });
    }
  );
});
