import { Router } from 'express';
import { createSale, listSales } from '../controllers/saleController';

const router = Router();

router.get('/', listSales);
router.post('/', createSale);

export default router;
