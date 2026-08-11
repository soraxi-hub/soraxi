import { existsSync } from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

/**
 * In-memory MongoDB replica set for the financial test suite.
 *
 * A replica set (not a standalone) is required because every financial write
 * path in Soraxi uses MongoDB transactions (ClientSession), and transactions
 * are only supported on replica sets.
 *
 * `connectToDatabase()` (src/lib/db/mongoose.ts) reads MONGODB_URI at call
 * time, so setting the env var here — before any service touches the DB — is
 * all that's needed to point the entire service layer at the test instance.
 */
let replSet: MongoMemoryReplSet | undefined;

/**
 * Prefer a locally installed mongod over downloading a ~780MB binary.
 * MONGOMS_SYSTEM_BINARY is honoured by mongodb-memory-server; leave it unset
 * (or set your own) to fall back to the downloaded binary.
 */
const LOCAL_MONGOD = "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe";

export async function startTestDb(): Promise<void> {
  if (!process.env.MONGOMS_SYSTEM_BINARY && existsSync(LOCAL_MONGOD)) {
    process.env.MONGOMS_SYSTEM_BINARY = LOCAL_MONGOD;
  }
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    // Windows (Defender scanning, cold spawn) regularly needs more than the
    // default 10s to bring an instance up.
    instanceOpts: [{ launchTimeout: 90_000 }],
  });
  process.env.MONGODB_URI = replSet.getUri();
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
    replSet = undefined;
  }
}

/**
 * Wipe all data between tests while keeping the connection (and the models'
 * indexes) alive. Much faster than dropping the database.
 */
export async function clearAllCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
}

/**
 * Run a callback inside a committed MongoDB transaction — the same pattern
 * every production call site uses around JournalEntryWriter.
 */
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
