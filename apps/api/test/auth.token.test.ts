import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { api, createUser, deleteUser } from './helpers';

// Every route that needs a login, checked with missing and bad tokens.
// The request bodies don't matter: the token check runs first.
const someId = new Types.ObjectId().toString();
const protectedRoutes = [
  ['DELETE', '/api/auth/me'],
  ['GET', '/api/installments'],
  ['POST', '/api/installments'],
  ['POST', '/api/installments/toggle'],
  ['GET', `/api/installments/${someId}`],
  ['PUT', `/api/installments/${someId}`],
  ['DELETE', `/api/installments/${someId}`],
] as const;

function send(method: string, path: string, authorization?: string) {
  const req = {
    GET: () => api().get(path),
    POST: () => api().post(path),
    PUT: () => api().put(path),
    DELETE: () => api().delete(path),
  }[method]!();
  return authorization ? req.set('Authorization', authorization) : req;
}

const sign = (id: string, secret: string, expiresIn: number | `${number}d`) =>
  jwt.sign({ id }, secret, { expiresIn });

let deletedUserToken: string;

beforeAll(async () => {
  // The auth check logs every rejected token; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {});

  // One sign-up for the whole file (the sign-up limit is 10 per file).
  const user = await createUser();
  await deleteUser(user);
  deletedUserToken = user.token;
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe.each(protectedRoutes)(
  '%s %s without a valid login',
  (method, path) => {
    it.each([
      ['no Authorization header', undefined],
      ['a non-Bearer header', 'Basic dXNlcjpwYXNz'],
    ])('answers 401 TOKEN_NOT_PROVIDED for %s', async (_case, header) => {
      const res = await send(method, path, header);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'TOKEN_NOT_PROVIDED' });
    });

    it.each([
      ['a token that is not a JWT', () => 'not-a-jwt'],
      [
        'a token signed with another secret',
        () => sign(someId, randomBytes(32).toString('hex'), '30d'),
      ],
      ['an expired token', () => sign(someId, process.env.JWT_SECRET!, -60)],
    ])('answers 401 TOKEN_INVALID for %s', async (_case, token) => {
      const res = await send(method, path, `Bearer ${token()}`);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'TOKEN_INVALID' });
    });

    it('answers 401 USER_NOT_FOUND for the token of a deleted user', async () => {
      const res = await send(method, path, `Bearer ${deletedUserToken}`);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'USER_NOT_FOUND' });
    });
  }
);
