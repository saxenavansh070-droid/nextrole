import dotenv from 'dotenv';
import path from 'node:path';

// Load the shared .env from the project root, then any server-local overrides.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'nextrole-dev-secret-change-me',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  grokApiKey: process.env.GROK_API_KEY ?? '',
  grokModel: process.env.GROK_MODEL ?? 'grok-4-fast',
  grokApiUrl: process.env.GROK_API_URL ?? 'https://api.x.ai/v1/chat/completions',
};
