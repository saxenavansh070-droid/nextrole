import { Router, type Response } from 'express';
import { data } from '../data';
import { isDbConnected } from '../db';
import { Role } from '../models';

const router = Router();

/** Role library - served from MongoDB when available, otherwise from nextrole.json. */
router.get('/', async (_req, res: Response) => {
  if (isDbConnected()) {
    try {
      const roles = await Role.find().lean();
      if (roles.length > 0) {
        res.json({ roles });
        return;
      }
    } catch (cause) {
      console.warn('[roles] falling back to nextrole.json:', cause);
    }
  }
  res.json({ roles: data.roleCatalog });
});

export default router;
