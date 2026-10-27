import { Router } from 'express';
import { createSale, listSales } from '../controllers/saleController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', listSales);
router.post('/', createSale);

export default router;
