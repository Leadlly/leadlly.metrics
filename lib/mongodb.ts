import { MongoClient, type Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _questionsClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise() {
  const uri = process.env.LEADLLY_DB_URL;
  if (!uri) {
    throw new Error("LEADLLY_DB_URL is not set");
  }
  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      readPreference: "primary",
    });
    globalThis._mongoClientPromise = client.connect();
  }
  return globalThis._mongoClientPromise;
}

function getQuestionsClientPromise() {
  const uri = process.env.LEADLLY_QUESTIONS_DB_URL;
  if (!uri) return null;
  if (!globalThis._questionsClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 6,
      readPreference: "primary",
    });
    globalThis._questionsClientPromise = client.connect();
  }
  return globalThis._questionsClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}

export async function getQuestionsDb(): Promise<Db | null> {
  const promise = getQuestionsClientPromise();
  if (!promise) return null;
  const client = await promise;
  return client.db();
}

export async function safeCount(
  db: Db,
  collection: string,
  filter: Record<string, unknown> = {},
) {
  try {
    return await db.collection(collection).countDocuments(filter);
  } catch {
    return 0;
  }
}
