import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createPurchaseOrder, createSupplier, getPurchaseOrder, listPurchaseOrders,
  listSuppliers, receivePurchaseOrder,
} from '../controllers/purchaseController';

const router = Router();
router.use(authenticate);
router.get('/suppliers', listSuppliers);
router.post('/suppliers', authorize('admin', 'manager'), createSupplier);
router.get('/orders', listPurchaseOrders);
router.get('/orders/:id', getPurchaseOrder);
router.post('/orders', authorize('admin', 'manager'), createPurchaseOrder);
router.post('/orders/:id/receive', authorize('admin', 'manager'), receivePurchaseOrder);
export default router;
