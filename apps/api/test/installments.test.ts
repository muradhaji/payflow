import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  api,
  createUser,
  deleteUser,
  installmentPayload,
  TestUser,
} from './helpers';

// Create, list, get, update and delete installments.
let owner: TestUser;
let other: TestUser;

const auth = (user: TestUser) => `Bearer ${user.token}`;
const create = (user: TestUser, body: object = installmentPayload()) =>
  api().post('/api/installments').set('Authorization', auth(user)).send(body);
const get = (user: TestUser, id: string) =>
  api().get(`/api/installments/${id}`).set('Authorization', auth(user));
const update = (user: TestUser, id: string, body: object) =>
  api()
    .put(`/api/installments/${id}`)
    .set('Authorization', auth(user))
    .send(body);
const remove = (user: TestUser, id: string) =>
  api().delete(`/api/installments/${id}`).set('Authorization', auth(user));

// The exact shape of an installment in every response.
const installmentShape = (user: TestUser, body = installmentPayload()) => ({
  _id: expect.any(String),
  user: user._id,
  title: body.title,
  amount: body.amount,
  monthCount: body.monthCount,
  startDate: `${body.startDate}T00:00:00.000Z`,
  monthlyPayments: body.monthlyPayments.map((payment) => ({
    _id: expect.any(String),
    date: `${payment.date}T00:00:00.000Z`,
    amount: payment.amount,
    paid: false,
    paidDate: null,
  })),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  __v: expect.any(Number),
});

beforeAll(async () => {
  owner = await createUser();
  other = await createUser();
});

// Deleting the users also deletes their installments.
afterAll(async () => {
  await deleteUser(owner);
  await deleteUser(other);
});

describe('POST /api/installments', () => {
  it('answers 201 with the new installment', async () => {
    const res = await create(owner);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(installmentShape(owner));
  });

  const valid = installmentPayload();
  const payments = valid.monthlyPayments;
  const withPayment = (index: number, change: object) => ({
    ...valid,
    monthlyPayments: payments.map((payment, i) =>
      i === index ? { ...payment, ...change } : payment
    ),
  });

  it.each([
    ['no title', { ...valid, title: undefined }, 'TITLE_REQUIRED'],
    ['a title that is a number', { ...valid, title: 123 }, 'TITLE_STRING'],
    [
      'a title shorter than 3 after trimming',
      { ...valid, title: '  ab  ' },
      'TITLE_MIN_LENGTH',
    ],
    [
      'a title longer than 50',
      { ...valid, title: 'a'.repeat(51) },
      'TITLE_MAX_LENGTH',
    ],
    ['no amount', { ...valid, amount: undefined }, 'AMOUNT_REQUIRED'],
    ['an amount as text', { ...valid, amount: '300' }, 'AMOUNT_NUMBER'],
    ['a negative amount', { ...valid, amount: -300 }, 'AMOUNT_POSITIVE'],
    [
      'no month count',
      { ...valid, monthCount: undefined },
      'MONTH_COUNT_REQUIRED',
    ],
    [
      'a month count as text',
      { ...valid, monthCount: 'three' },
      'MONTH_COUNT_NUMBER',
    ],
    ['a negative month count', { ...valid, monthCount: -1 }, 'MONTH_COUNT_MIN'],
    [
      'no start date',
      { ...valid, startDate: undefined },
      'START_DATE_REQUIRED',
    ],
    [
      'a start date as a number',
      { ...valid, startDate: 20260115 },
      'START_DATE_STRING',
    ],
    [
      'a start date in another format',
      { ...valid, startDate: '15.01.2026' },
      'START_DATE_INVALID',
    ],
    [
      'a start date that does not exist',
      { ...valid, startDate: '2026-13-45' },
      'START_DATE_INVALID',
    ],
    [
      'no monthly payments',
      { ...valid, monthlyPayments: undefined },
      'MONTHLY_PAYMENTS_REQUIRED',
    ],
    [
      'monthly payments as an object',
      { ...valid, monthlyPayments: {} },
      'MONTHLY_PAYMENTS_ARRAY',
    ],
    [
      'fewer payments than months',
      { ...valid, monthlyPayments: payments.slice(1) },
      'MONTHLY_PAYMENTS_COUNT_MISMATCH',
    ],
    [
      'payments that do not add up to the amount',
      withPayment(2, { amount: 99 }),
      'MONTHLY_PAYMENTS_TOTAL_MISMATCH',
    ],
  ])('answers 400 for %s', async (_case, body, message) => {
    const res = await create(owner, body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message });
  });

  it.each([
    [
      'no date',
      withPayment(1, { date: undefined }),
      'MONTHLY_PAYMENT_DATE_REQUIRED',
    ],
    [
      'a date as a number',
      withPayment(1, { date: 20260215 }),
      'MONTHLY_PAYMENT_DATE_STRING',
    ],
    [
      'a date in another format',
      withPayment(1, { date: '15/02/2026' }),
      'MONTHLY_PAYMENT_DATE_INVALID',
    ],
    [
      'no amount',
      withPayment(1, { amount: undefined }),
      'MONTHLY_PAYMENT_AMOUNT_REQUIRED',
    ],
    [
      'an amount as text',
      withPayment(1, { amount: '100' }),
      'MONTHLY_PAYMENT_AMOUNT_NUMBER',
    ],
    [
      'a negative amount',
      withPayment(1, { amount: -100 }),
      'MONTHLY_PAYMENT_AMOUNT_POSITIVE',
    ],
  ])(
    'answers 400 with the index for a payment with %s',
    async (_case, body, message) => {
      const res = await create(owner, body);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message, index: 1 });
    }
  );

  // Known bug: a payment that is not an object (here null) is not checked,
  // so reading its date fails and the error handler answers 500. The API
  // keeps running. Should be 400; shared schemas in spec 004 fix it.
  it('answers 500 UNKNOWN for a payment that is null (known bug)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await create(owner, {
      ...valid,
      monthlyPayments: [null, ...payments.slice(1)],
    });
    vi.restoreAllMocks();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'UNKNOWN' });
  });
});

describe('GET /api/installments', () => {
  it("answers 200 with only the user's own installments, newest first", async () => {
    const user = await createUser();
    try {
      const first = await create(user, installmentPayload('First one'));
      const second = await create(user, installmentPayload('Second one'));
      await create(other, installmentPayload('Not yours'));

      const res = await api()
        .get('/api/installments')
        .set('Authorization', auth(user));

      expect(res.status).toBe(200);
      expect(res.body.map((i: { _id: string }) => i._id)).toEqual([
        second.body._id,
        first.body._id,
      ]);
      expect(res.body[0]).toEqual(
        installmentShape(user, installmentPayload('Second one'))
      );
    } finally {
      await deleteUser(user);
    }
  });
});

describe('GET /api/installments/:id', () => {
  it('answers 200 with the installment', async () => {
    const created = await create(owner);
    const res = await get(owner, created.body._id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created.body);
  });
});

describe('PUT /api/installments/:id', () => {
  it('answers 200 with the installment, replaced by the new values', async () => {
    const created = await create(owner);
    const changed = {
      title: 'Laptop',
      amount: 1000,
      monthCount: 2,
      startDate: '2026-05-01',
      monthlyPayments: [
        { date: '2026-05-01', amount: 500 },
        { date: '2026-06-01', amount: 500 },
      ],
    };

    const res = await update(owner, created.body._id, changed);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...installmentShape(owner, changed),
      _id: created.body._id,
      createdAt: created.body.createdAt,
    });
    expect((await get(owner, created.body._id)).body).toEqual(res.body);
  });

  it('answers 400 with the same checks as create, and changes nothing', async () => {
    const created = await create(owner);
    const res = await update(owner, created.body._id, {
      ...installmentPayload(),
      title: undefined,
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'TITLE_REQUIRED' });
    expect((await get(owner, created.body._id)).body).toEqual(created.body);
  });
});

describe('DELETE /api/installments/:id', () => {
  it('answers 200 INSTALLMENT_DELETED, and the installment is gone', async () => {
    const created = await create(owner);
    const res = await remove(owner, created.body._id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'INSTALLMENT_DELETED' });
    expect((await get(owner, created.body._id)).status).toBe(404);
  });
});

// The same 404 for an invalid id, an unknown id and another user's
// installment, so the API does not reveal which installments exist.
describe.each([
  ['GET', (user: TestUser, id: string) => get(user, id)],
  [
    'PUT',
    (user: TestUser, id: string) => update(user, id, installmentPayload()),
  ],
  ['DELETE', (user: TestUser, id: string) => remove(user, id)],
])('%s /api/installments/:id that the user cannot see', (_method, call) => {
  it.each([
    ['an invalid id', () => 'abc'],
    ['an unknown id', () => new Types.ObjectId().toString()],
  ])('answers 404 INSTALLMENT_NOT_FOUND for %s', async (_case, id) => {
    const res = await call(owner, id());
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'INSTALLMENT_NOT_FOUND' });
  });

  it("answers 404 INSTALLMENT_NOT_FOUND for another user's installment, and changes nothing", async () => {
    const created = await create(other);
    const res = await call(owner, created.body._id);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'INSTALLMENT_NOT_FOUND' });
    expect((await get(other, created.body._id)).body).toEqual(created.body);
  });
});
