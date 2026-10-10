import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';

export type AuthedRequest = Request & { userId?: string };

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: '7d' });
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Rejects requests without a valid session token. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sign in required.' });
    return;
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    if (!payload.sub) throw new Error('Token missing subject');
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Your session expired. Please sign in again.' });
  }
}

/** Attaches userId when a valid token is present, otherwise continues. */
export function optionalAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
      if (payload.sub) req.userId = payload.sub;
    } catch {
      // Ignore invalid tokens on public routes.
    }
  }
  next();
}

export function isObjectIdString(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}
