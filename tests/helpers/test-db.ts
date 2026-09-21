import { existsSync } from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

import { getDisputeRecordModel } from "@/lib/db/models/dispute-record.model";
import { getRefundRecordModel } from "@/lib/db/models/refund-record.model";
import { getTransactionRecordModel } from "@/lib/db/models/transaction-record.model";
import { getVendorWalletModel } from "@/lib/db/models/vendor-wallet.model";
import { getPlatformWalletModel } from "@/lib/db/models/platform-wallet.model";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getUserModel } from "@/lib/db/models/user.model";
// …plus every other model the financial suite touches

mongoose.set("autoCreate", false);
mongoose.set("autoIndex", false);

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
    instanceOpts: [
      {
        // Windows (Defender scanning, cold spawn) regularly needs more than
        // the default 10s to bring an instance up.
        launchTimeout: 90_000,
        // MongoDB defaults transactions to a 5ms lock wait, which is far too
        // tight on a single-node in-memory replset running tests back to
        // back — transactions intermittently fail to acquire an IX lock even
        // with no real contention. Production uses a real replica set and is
        // unaffected; this only removes test flakiness.
        args: ["--setParameter", "maxTransactionLockRequestTimeoutMillis=5000"],
      },
    ],
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
    Object.values(collections).map((collection) => collection.deleteMany({})),
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

export async function ensureCollections(): Promise<void> {
  const models = await Promise.all([
    getDisputeRecordModel(),
    getRefundRecordModel(),
    getTransactionRecordModel(),
    getVendorWalletModel(),
    getPlatformWalletModel(),
    getOrderModel(),
    getUserModel(),
  ]);
  // Model.init() awaits both createCollection() AND createIndexes().
  await Promise.all(models.map((m) => m.init()));
}
