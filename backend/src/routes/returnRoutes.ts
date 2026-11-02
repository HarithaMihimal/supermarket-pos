import { Router } from 'express';
import { createReturn, getReturnableSale } from '../controllers/returnController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/receipts/:id', getReturnableSale);
router.post('/', createReturn);

export default router;
