import mongoose from 'mongoose';
import { env } from './env';

/** Connect to MongoDB without crashing the app when the database is unavailable. */
export async function connectDb(): Promise<void> {
  if (!env.mongoUri) {
    console.warn('[db] MONGODB_URI is not set - running without persistence.');
    return;
  }
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 4000 });
    console.log('[db] MongoDB connected');
  } catch (cause) {
    console.warn(
      '[db] MongoDB unavailable - continuing without persistence:',
      cause instanceof Error ? cause.message : cause,
    );
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
