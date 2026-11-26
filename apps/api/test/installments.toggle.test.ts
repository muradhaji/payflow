import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  api,
  createUser,
  deleteUser,
  installmentPayload,
  TestUser,
} from './helpers';

// POST /api/installments/toggle, as it works today (US-PAY-01, US-PAY-02).
// Spec 005 changes this on purpose: today the client decides, and every
// request flips the payments it names, so sending the same request twice
// undoes it (not idempotent). Update these tests together with 005.
let owner: TestUser;
let other: TestUser;

const toggle = (user: TestUser, body?: unknown) =>
  api()
    .post('/api/installments/toggle')
    .set('Authorization', `Bearer ${user.token}`)
    .send(body as object);

async function createInstallment(user: TestUser, title = 'Test phone') {
  const res = await api()
    .post('/api/installments')
    .set('Authorization', `Bearer ${user.token}`)
    .send(installmentPayload(title));
  return res.body;
}

const getInstallment = async (user: TestUser, id: string) =>
  (
    await api()
      .get(`/api/installments/${id}`)
      .set('Authorization', `Bearer ${user.token}`)
  ).body;

beforeAll(async () => {
  owner = await createUser();
  other = await createUser();
});

afterAll(async () => {
  await deleteUser(owner);
  await deleteUser(other);
});

describe('POST /api/installments/toggle', () => {
  it('marks the named payments paid and answers 200 with the installment', async () => {
    const installment = await createInstallment(owner);
    const [first, second, third] = installment.monthlyPayments;
    const before = Date.now();

    const res = await toggle(owner, [
      { installmentId: installment._id, paymentId: first._id },
      { installmentId: installment._id, paymentId: third._id },
    ]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const [paidFirst, unchanged, paidThird] = res.body[0].monthlyPayments;
    for (const paid of [paidFirst, paidThird]) {
      expect(paid.paid).toBe(true);
      expect(Date.parse(paid.paidDate)).toBeGreaterThanOrEqual(before - 1000);
    }
    expect(unchanged).toEqual(second);
    expect(await getInstallment(owner, installment._id)).toEqual(res.body[0]);
  });

  it('marks a paid payment unpaid again, and the same request twice undoes itself', async () => {
    const installment = await createInstallment(owner);
    const body = [
      {
        installmentId: installment._id,
        paymentId: installment.monthlyPayments[0]._id,
      },
    ];

    await toggle(owner, body);
    const res = await toggle(owner, body);

    expect(res.status).toBe(200);
    expect(res.body[0].monthlyPayments[0]).toEqual({
      ...installment.monthlyPayments[0],
      paid: false,
      paidDate: null,
    });
  });

  it('changes several installments in one request', async () => {
    const a = await createInstallment(owner, 'First one');
    const b = await createInstallment(owner, 'Second one');

    const res = await toggle(owner, [
      { installmentId: a._id, paymentId: a.monthlyPayments[0]._id },
      { installmentId: b._id, paymentId: b.monthlyPayments[1]._id },
    ]);

    expect(res.status).toBe(200);
    expect(res.body.map((i: { _id: string }) => i._id).sort()).toEqual(
      [a._id, b._id].sort()
    );
  });

  it('flips a payment named twice in one request only once', async () => {
    const installment = await createInstallment(owner);
    const item = {
      installmentId: installment._id,
      paymentId: installment.monthlyPayments[0]._id,
    };

    const res = await toggle(owner, [item, item]);

    expect(res.status).toBe(200);
    expect(res.body[0].monthlyPayments[0].paid).toBe(true);
  });

  it('ignores an unknown payment id and still answers with the installment', async () => {
    const installment = await createInstallment(owner);

    const res = await toggle(owner, [
      {
        installmentId: installment._id,
        paymentId: new Types.ObjectId().toString(),
      },
    ]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].monthlyPayments).toEqual(installment.monthlyPayments);
  });

  it("skips invalid, unknown and other users' installments without an error", async () => {
    const othersInstallment = await createInstallment(other);
    const paymentId = othersInstallment.monthlyPayments[0]._id;

    const res = await toggle(owner, [
      { installmentId: 'abc', paymentId },
      { installmentId: new Types.ObjectId().toString(), paymentId },
      { installmentId: othersInstallment._id, paymentId },
    ]);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(await getInstallment(other, othersInstallment._id)).toEqual(
      othersInstallment
    );
  });

  it.each([
    ['no body', undefined],
    ['an empty array', []],
    ['an object instead of an array', { installmentId: 'abc', paymentId: 'x' }],
  ])('answers 400 UPDATE_PAYMENTS_ARRAY for %s', async (_case, body) => {
    const res = await toggle(owner, body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'UPDATE_PAYMENTS_ARRAY' });
  });

  // Known bug: items are not checked, so a null item fails while grouping
  // and the error handler answers 500. The API keeps running. Should be
  // 400; spec 005 reworks this route.
  it('answers 500 UNKNOWN for a null item (known bug)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await toggle(owner, [null]);
    vi.restoreAllMocks();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'UNKNOWN' });
  });
});
