import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authorize } from '../middleware/auth';

const router = Router();

router.get('/', getSettings);
router.put('/', authorize('admin', 'manager'), updateSettings);

export default router;
