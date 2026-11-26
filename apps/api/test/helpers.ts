import { randomBytes } from 'node:crypto';
import request from 'supertest';
import app from '../src/app';

export const api = () => request(app);

// Meets the sign-up rules: 8–20 characters, letters and at least one digit.
export const TEST_PASSWORD = 'Testpass123';

export interface TestUser {
  _id: string;
  username: string;
  token: string;
}

// Usernames allow only lowercase letters and digits, 6–20 characters.
// "t" + 12 random characters never collides with another run.
export function uniqueUsername(): string {
  return `t${randomBytes(6).toString('hex')}`;
}

// Signs up a new user through the API.
export async function createUser(): Promise<TestUser> {
  const username = uniqueUsername();
  const res = await api()
    .post('/api/auth/signup')
    .send({ username, password: TEST_PASSWORD });
  if (res.status !== 201) {
    throw new Error(
      `Sign-up failed: ${res.status} ${JSON.stringify(res.body)}`
    );
  }
  return res.body;
}

// Deletes the user and all their installments through the API.
export async function deleteUser(user: TestUser): Promise<void> {
  await api()
    .delete('/api/auth/me')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ password: TEST_PASSWORD });
}
