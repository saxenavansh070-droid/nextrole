import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { data } from './data';
import { connectDb, isDbConnected } from './db';
import { env } from './env';
import { seedRoles } from './models';
import analyzeRouter from './routes/analyze';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import rolesRouter from './routes/roles';

async function main(): Promise<void> {
  await connectDb();
  if (isDbConnected()) {
    await seedRoles(data.roleCatalog);
  }

  const app = express();

  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, title: data.title, db: isDbConnected() });
  });

  app.use('/api/analyze', analyzeRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/profile', profileRouter);

  // Production / desktop mode: serve the built client from the same origin.
  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  const clientIndex = path.join(clientDist, 'index.html');
  if (fs.existsSync(clientIndex)) {
    app.use(express.static(clientDist));
    // Single-page-app fallback: any non-API GET returns the client shell.
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(clientIndex);
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // JSON errors (e.g. file larger than 10 MB).
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const type = (err as { type?: string } | null)?.type;
    if (type === 'entity.too.large') {
      res.status(413).json({ error: 'That file is larger than 10 MB.' });
      return;
    }
    console.error('[server] unhandled error:', err);
    res.status(500).json({ error: data.experience.errors.server });
  });

  app.listen(env.port, () => {
    console.log(`[server] Next Role API listening on http://localhost:${env.port}`);
    console.log(`[server] Grok AI ${env.grokApiKey ? 'enabled' : 'disabled (local matching)'}`);
  });
}

main().catch((cause) => {
  console.error('[server] failed to start:', cause);
  process.exit(1);
});
