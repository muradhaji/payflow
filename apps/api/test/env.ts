import path from 'node:path';
import dotenv from 'dotenv';

// The only database the tests may use (spec 003).
export const TEST_DATABASE = 'payflow-test';

// Locally MONGO_URI_TEST comes from apps/api/.env; in CI it is a secret
// set as an environment variable (dotenv never overrides those).
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export function testMongoUri(): string {
  const uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    throw new Error(
      'MONGO_URI_TEST is missing. Set it in apps/api/.env (see .env.example).'
    );
  }
  return uri;
}
