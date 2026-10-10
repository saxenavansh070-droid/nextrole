import { Router, type Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../env';
import { isDbConnected } from '../db';
import { type AuthedRequest, signToken } from '../middleware/auth';
import { User } from '../models';
import { hashPassword, verifyPassword } from '../services/passwords';
import * as fileStore from '../store';

const router = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type AccountRecord = {
  source: 'mongo' | 'store';
  id: string;
  name: string;
  email: string;
  picture?: string;
  passwordHash?: string;
};

/** Loads an account by email from MongoDB (when connected) or the file store. */
async function findAccount(email: string): Promise<AccountRecord | null> {
  if (isDbConnected()) {
    try {
      const user = await User.findOne({ email });
      if (user) {
        return {
          source: 'mongo',
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          picture: user.picture,
          passwordHash: user.passwordHash,
        };
      }
    } catch (cause) {
      console.warn('[auth] could not read user from MongoDB:', cause);
    }
  }
  const stored = fileStore.findUserByEmail(email);
  if (stored) {
    return {
      source: 'store',
      id: stored.id,
      name: stored.name,
      email: stored.email,
      picture: stored.picture,
      passwordHash: stored.passwordHash,
    };
  }
  return null;
}

/** Persists a password hash onto an existing account. */
async function setAccountPassword(account: AccountRecord, passwordHash: string): Promise<void> {
  if (account.source === 'mongo') {
    try {
      await User.updateOne({ _id: account.id }, { $set: { passwordHash } });
      return;
    } catch (cause) {
      console.warn('[auth] could not save password to MongoDB:', cause);
    }
  }
  fileStore.setUserPasswordHash(account.id, passwordHash);
}

/**
 * Upserts a user in MongoDB when connected, otherwise in the file store
 * inside `nextrole.json`. Always returns a stable userId.
 */
async function startSession(
  profile: {
    googleId?: string;
    name: string;
    email: string;
    picture?: string;
    passwordHash?: string;
  },
  res: Response,
): Promise<void> {
  let userId: string | undefined;
  let mongoId: string | undefined;

  if (isDbConnected()) {
    try {
      const user = await User.findOneAndUpdate(
        {
          $or: [
            ...(profile.googleId ? [{ googleId: profile.googleId }] : []),
            { email: profile.email },
          ],
        },
        {
          $set: {
            ...(profile.googleId ? { googleId: profile.googleId } : {}),
            name: profile.name,
            email: profile.email,
            ...(profile.picture ? { picture: profile.picture } : {}),
            ...(profile.passwordHash ? { passwordHash: profile.passwordHash } : {}),
          },
          $setOnInsert: { googleId: profile.googleId ?? `local:${profile.email.toLowerCase()}` },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      mongoId = user?._id.toString();
      userId = mongoId;
    } catch (cause) {
      console.warn('[auth] could not persist user to MongoDB:', cause);
    }
  }

  if (!userId) {
    const stored = fileStore.upsertUser(profile);
    userId = stored.id;
  }

  res.json({
    token: signToken(userId),
    user: {
      id: userId,
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
    },
  });
}

/** Verifies a Google ID token (Google OAuth) and starts a Next Role session. */
router.post('/google', async (req: AuthedRequest, res: Response) => {
  const credential = (req.body ?? {}) as { credential?: unknown };
  if (typeof credential.credential !== 'string' || !credential.credential.trim()) {
    res.status(400).json({ error: 'Missing Google credential.' });
    return;
  }

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: credential.credential,
      ...(env.googleClientId ? { audience: env.googleClientId } : {}),
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      res.status(401).json({ error: 'Google sign-in could not be verified.' });
      return;
    }

    await startSession(
      {
        googleId: payload.sub,
        name: payload.name ?? payload.email,
        email: payload.email,
        picture: payload.picture,
      },
      res,
    );
  } catch (cause) {
    console.warn('[auth] google verification failed:', cause);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

/**
 * Password sign-in and sign-up.
 *   POST /api/auth/local { mode: 'signup', name, email, password }  -> create account
 *   POST /api/auth/local { mode: 'signin', email, password }        -> sign in
 * Works with no external configuration, so the flow is always usable
 * alongside Google OAuth.
 */
router.post('/local', async (req: AuthedRequest, res: Response) => {
  const body = (req.body ?? {}) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    mode?: unknown;
  };
  const mode = body.mode === 'signup' ? 'signup' : 'signin';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = (typeof body.email === 'string' ? body.email.trim() : '').toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!EMAIL_PATTERN.test(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    res
      .status(400)
      .json({ error: `Your password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
    return;
  }

  try {
    if (mode === 'signup') {
      if (name.length < 2) {
        res.status(400).json({ error: 'Please enter your name.' });
        return;
      }
      const existing = await findAccount(email);
      if (existing) {
        res
          .status(409)
          .json({ error: 'An account with this email already exists. Please sign in instead.' });
        return;
      }
      await startSession({ name, email, passwordHash: hashPassword(password) }, res);
      return;
    }

    // ---- sign in ----
    const account = await findAccount(email);
    if (!account) {
      res.status(404).json({ error: 'No account found with this email. Please sign up first.' });
      return;
    }
    if (!account.passwordHash) {
      // Legacy passwordless account (created before passwords): secure it now.
      await setAccountPassword(account, hashPassword(password));
    } else if (!verifyPassword(password, account.passwordHash)) {
      res.status(401).json({ error: 'Incorrect email or password. Please try again.' });
      return;
    }
    await startSession(
      { name: account.name, email: account.email, picture: account.picture },
      res,
    );
  } catch (cause) {
    console.warn('[auth] local sign-in failed:', cause);
    res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

export default router;
