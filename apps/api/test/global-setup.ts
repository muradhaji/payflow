import mongoose from 'mongoose';
import { TEST_DATABASE, testMongoUri } from './env';

// Runs once, before any test file. Connects, checks which database the
// connection string points to, and stops the whole run unless it is
// payflow-test, so the tests can never touch dev or production data.
export default async function checkTestDatabase(): Promise<void> {
  const connection = await mongoose
    .createConnection(testMongoUri(), { serverSelectionTimeoutMS: 15_000 })
    .asPromise();
  const name = connection.db?.databaseName;
  await connection.close();

  if (name !== TEST_DATABASE) {
    throw new Error(
      `Tests stopped: MONGO_URI_TEST points to the database "${name}". ` +
        `Only "${TEST_DATABASE}" is allowed.`
    );
  }
}
