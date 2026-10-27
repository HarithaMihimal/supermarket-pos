import { Router } from 'express';
import { adjustInventory, listInventory } from '../controllers/inventoryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listInventory);
router.post('/adjustments', authorize('admin', 'manager'), adjustInventory);

export default router;
