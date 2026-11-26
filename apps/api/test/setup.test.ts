import { afterAll, describe, expect, it } from 'vitest';
import { User } from '../src/models/user.model';
import { api, createUser, deleteUser, TestUser } from './helpers';

// Checks the test setup itself; the route tests come in later files.
describe('test setup', () => {
  let user: TestUser | undefined;

  afterAll(async () => {
    if (user) await deleteUser(user);
  });

  it('serves the app without a port', async () => {
    const res = await api().get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('PayFlow API is running!');
  });

  it('creates and deletes a test user in payflow-test', async () => {
    user = await createUser();
    expect(await User.exists({ username: user.username })).toBeTruthy();

    await deleteUser(user);
    expect(await User.exists({ username: user.username })).toBeNull();
    user = undefined;
  });
});
