import { Router, json, raw, type Response } from 'express';
import { Types } from 'mongoose';
import { data } from '../data';
import { isDbConnected } from '../db';
import { type AuthedRequest, optionalAuth } from '../middleware/auth';
import { Analysis } from '../models';
import { cleanText, ExtractionError, extractText } from '../services/extract';
import { analyzeWithGrok } from '../services/grok';
import { matchLocally } from '../services/matcher';
import * as fileStore from '../store';

const router = Router();

router.use(raw({ type: 'application/octet-stream', limit: '10mb' }));

router.post('/', optionalAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const contentType = String(req.headers['content-type'] ?? '');
    let text = '';
    let fileName: string | undefined;

    if (contentType.includes('application/json')) {
      const body = (req.body ?? {}) as { text?: unknown };
      text = typeof body.text === 'string' ? body.text : '';
    } else if (Buffer.isBuffer(req.body)) {
      const header = req.headers['x-filename'];
      fileName = typeof header === 'string' ? decodeURIComponent(header) : 'resume.txt';
      text = await extractText(req.body, fileName);
    } else {
      res.status(415).json({ error: 'Unsupported request. Send JSON text or a raw file.' });
      return;
    }

    text = cleanText(text);

    if (!text) {
      res.status(400).json({ error: data.experience.errors.empty });
      return;
    }
    if (text.length < 60) {
      res.status(400).json({ error: data.experience.errors.tooShort });
      return;
    }

    // Prefer Grok, fall back to the local matcher from nextrole.json.
    const grokResult = await analyzeWithGrok(text);
    const analysis = grokResult ?? matchLocally(text);
    const source: 'grok' | 'local' = grokResult ? 'grok' : 'local';
    console.log(
      `[analyze] ${fileName ?? 'pasted text'}: ${text.length} chars, ${analysis.skills.length} skills, ${analysis.roles.length} roles (${source})`,
    );

    let saved = false;
    if (req.userId) {
      if (isDbConnected() && Types.ObjectId.isValid(req.userId)) {
        try {
          await Analysis.create({
            user: new Types.ObjectId(req.userId),
            fileName,
            skills: analysis.skills,
            summary: analysis.summary,
            roles: analysis.roles,
            source,
          });
          saved = true;
        } catch (cause) {
          console.warn('[analyze] could not save analysis:', cause);
        }
      } else if (!isDbConnected()) {
        // No MongoDB: keep the user's history in the nextrole.json store.
        try {
          fileStore.saveAnalysis(req.userId, {
            fileName,
            skills: analysis.skills,
            summary: analysis.summary,
            roles: analysis.roles,
            source,
          });
          saved = true;
        } catch (cause) {
          console.warn('[analyze] could not save analysis to file store:', cause);
        }
      }
    }

    res.json({ ok: true, saved, fileName, source, ...analysis });
  } catch (cause) {
    if (cause instanceof ExtractionError) {
      res.status(422).json({ error: cause.message });
      return;
    }
    console.error('[analyze] failed:', cause);
    res.status(500).json({ error: data.experience.errors.server });
  }
});

export default router;
