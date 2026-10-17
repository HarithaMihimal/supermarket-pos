import { Router } from 'express';
import { createSale } from '../controllers/saleController';

const router = Router();

router.post('/', createSale);

export default router;
