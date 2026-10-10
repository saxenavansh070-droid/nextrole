import { Router, type Response } from 'express';
import { Types } from 'mongoose';
import { isDbConnected } from '../db';
import { type AuthedRequest, isObjectIdString, requireAuth } from '../middleware/auth';
import { Analysis } from '../models';
import * as fileStore from '../store';

const router = Router();

router.use(requireAuth);

/** Saved analyses for the signed-in user, newest first. */
router.get('/', async (req: AuthedRequest, res: Response) => {
  const userId = req.userId ?? '';

  // MongoDB when connected, otherwise the store inside nextrole.json.
  if (isDbConnected() && isObjectIdString(userId)) {
    try {
      const docs = await Analysis.find({ user: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();

      res.json({
        count: docs.length,
        analyses: docs.map((doc) => ({
          id: doc._id.toString(),
          fileName: doc.fileName,
          summary: doc.summary,
          skills: doc.skills ?? [],
          roles: doc.roles ?? [],
          source: doc.source,
          createdAt: doc.createdAt ?? new Date(),
        })),
      });
      return;
    } catch (cause) {
      console.warn('[profile] could not load analyses:', cause);
    }
  }

  if (isDbConnected() || !userId) {
    res.json({ count: 0, analyses: [] });
    return;
  }

  const analyses = fileStore.listAnalyses(userId);
  res.json({ count: analyses.length, analyses });
});

/** Delete one saved analysis. */
router.delete('/analysis/:id', async (req: AuthedRequest, res: Response) => {
  const userId = req.userId ?? '';
  const id = req.params.id ?? '';

  if (isDbConnected() && isObjectIdString(userId) && Types.ObjectId.isValid(id)) {
    try {
      const result = await Analysis.deleteOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: 'Analysis not found.' });
        return;
      }
      res.json({ ok: true });
      return;
    } catch (cause) {
      console.warn('[profile] delete failed:', cause);
      res.status(500).json({ error: 'Could not delete that analysis.' });
      return;
    }
  }

  if (!isDbConnected() && fileStore.deleteAnalysis(userId, id)) {
    res.json({ ok: true });
    return;
  }

  res.status(404).json({ error: 'Analysis not found.' });
});

export default router;
