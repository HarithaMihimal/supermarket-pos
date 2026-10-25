import { Router } from 'express';
import { adjustInventory, listInventory } from '../controllers/inventoryController';

const router = Router();

router.get('/', listInventory);
router.post('/adjustments', adjustInventory);

export default router;
