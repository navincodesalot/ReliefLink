import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set. Copy .env.example to .env.");
}

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  _relieflinkMongoose?: Cached;
};

const cached: Cached = globalForMongoose._relieflinkMongoose ?? {
  conn: null,
  promise: null,
};

globalForMongoose._relieflinkMongoose = cached;

export async function connectDb(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      dbName: "relieflink",
      serverSelectionTimeoutMS: 8000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
