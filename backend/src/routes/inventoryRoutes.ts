import { Router } from 'express';
import { adjustInventory, listInventory } from '../controllers/inventoryController';
import { authenticate, authorize } from '../middleware/auth';
import { createStockTransfer, listStockTransfers } from '../controllers/stockTransferController';

const router = Router();
router.use(authenticate);

router.get('/', listInventory);
router.post('/adjustments', authorize('admin', 'manager'), adjustInventory);
router.get('/transfers', listStockTransfers);
router.post('/transfers', authorize('admin', 'manager'), createStockTransfer);

export default router;
