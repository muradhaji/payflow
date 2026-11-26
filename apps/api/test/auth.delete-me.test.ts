import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Installment } from '../src/models/installment.model';
import { User } from '../src/models/user.model';
import {
  api,
  createUser,
  deleteUser,
  installmentPayload,
  TEST_PASSWORD,
  TestUser,
} from './helpers';

// DELETE /api/auth/me: deletes the account and all its installments.
describe('DELETE /api/auth/me', () => {
  let user: TestUser;
  const deleteMe = (body?: object) =>
    api()
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send(body);

  beforeAll(async () => {
    user = await createUser();
    const created = await api()
      .post('/api/installments')
      .set('Authorization', `Bearer ${user.token}`)
      .send(installmentPayload());
    expect(created.status).toBe(201);
  });

  // Only needed if a test fails before the account is deleted.
  afterAll(async () => {
    await deleteUser(user);
  });

  it.each([
    ['no password', undefined, 400, 'PASSWORD_REQUIRED'],
    ['password as an array', { password: ['x'] }, 400, 'PASSWORD_INVALID'],
    [
      'a wrong password',
      { password: 'Wrongpass123' },
      401,
      'PASSWORD_INCORRECT',
    ],
  ])(
    'keeps the account and answers %s',
    async (_case, body, status, message) => {
      const res = await deleteMe(body);
      expect(res.status).toBe(status);
      expect(res.body).toEqual({ message });
      expect(await User.exists({ _id: user._id })).toBeTruthy();
    }
  );

  it('answers 200 USER_DELETED and removes the user and their installments', async () => {
    const res = await deleteMe({ password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'USER_DELETED' });
    expect(await User.exists({ _id: user._id })).toBeNull();
    expect(await Installment.countDocuments({ user: user._id })).toBe(0);

    const login = await api()
      .post('/api/auth/login')
      .send({ username: user.username, password: TEST_PASSWORD });
    expect(login.status).toBe(401);
  });
});
