import { Router } from 'express';
import { getManagementReports } from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('admin', 'manager'));
router.get('/', getManagementReports);

export default router;