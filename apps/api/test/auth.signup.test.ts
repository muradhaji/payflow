import { afterAll, describe, expect, it } from 'vitest';
import { User } from '../src/models/user.model';
import {
  api,
  deleteUser,
  TEST_PASSWORD,
  TestUser,
  uniqueUsername,
} from './helpers';

// POST /api/auth/signup. The sign-up limit counts every attempt (10 per
// file), so this file makes at most 10 sign-up requests.
describe('POST /api/auth/signup', () => {
  const signup = (body: object) => api().post('/api/auth/signup').send(body);
  let user: TestUser | undefined;

  afterAll(async () => {
    if (user) await deleteUser(user);
  });

  it('creates the user and answers 201 with id, username and token', async () => {
    const username = uniqueUsername();
    const res = await signup({ username, password: TEST_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      _id: expect.any(String),
      username,
      token: expect.any(String),
    });
    user = res.body;

    // The password is stored hashed, never as sent.
    const stored = await User.findById(res.body._id);
    expect(stored?.password).toBeTruthy();
    expect(stored?.password).not.toBe(TEST_PASSWORD);
  });

  it('answers 400 USERNAME_EXISTS for a taken username', async () => {
    const res = await signup({
      username: user!.username,
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'USERNAME_EXISTS' });
  });

  it.each([
    ['no username', { password: TEST_PASSWORD }, 'USERNAME_REQUIRED'],
    [
      'username as an array',
      { username: ['abcdefg'], password: TEST_PASSWORD },
      'USERNAME_INVALID',
    ],
    [
      'username shorter than 6',
      { username: 'abc12', password: TEST_PASSWORD },
      'USERNAME_MIN_LENGTH',
    ],
    [
      'username longer than 20',
      { username: 'a'.repeat(21), password: TEST_PASSWORD },
      'USERNAME_MAX_LENGTH',
    ],
    [
      'username with capitals',
      { username: 'TestUser1', password: TEST_PASSWORD },
      'USERNAME_INVALID',
    ],
    ['no password', { username: 'validname1' }, 'PASSWORD_REQUIRED'],
    [
      'password as an array',
      { username: 'validname1', password: ['Testpass123'] },
      'PASSWORD_INVALID',
    ],
    [
      'password without a digit',
      { username: 'validname1', password: 'onlyletters' },
      'PASSWORD_INVALID',
    ],
  ])('answers 400 for %s', async (_case, body, message) => {
    const res = await signup(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message });
  });
});
