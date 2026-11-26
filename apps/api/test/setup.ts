import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';
import { TEST_DATABASE, testMongoUri } from './env';

// Tokens only need to be valid inside this run, so any random value works.
process.env.JWT_SECRET = randomBytes(32).toString('hex');

// Every test file gets its own copy of the app and its own connection.
beforeAll(async () => {
  await mongoose.connect(testMongoUri(), { serverSelectionTimeoutMS: 15_000 });
  // Checked again here, in case a test file is run on its own.
  if (mongoose.connection.db?.databaseName !== TEST_DATABASE) {
    throw new Error(`Tests stopped: only "${TEST_DATABASE}" is allowed.`);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});
