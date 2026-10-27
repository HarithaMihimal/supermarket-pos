import { Router } from 'express';
import { createSale, getSaleDetails, listSales } from '../controllers/saleController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', listSales);
router.get('/:id', getSaleDetails);
router.post('/', createSale);

export default router;
