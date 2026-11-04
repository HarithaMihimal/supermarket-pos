import type { NextFunction, Request, Response } from 'express';
import { productIdSchema } from '../schemas/productSchema';
import { goodsReceiptSchema, purchaseOrderSchema, supplierSchema } from '../schemas/purchaseSchema';
import * as purchaseService from '../services/purchaseService';
import { writeAudit } from '../utils/audit';

export async function listSuppliers(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await purchaseService.listSuppliers() }); } catch (error) { next(error); }
}

export async function createSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await purchaseService.createSupplier(supplierSchema.parse(req.body));
    await writeAudit(req, 'supplier.created', 'supplier', supplier.supplier_id, { name: supplier.name });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) { next(error); }
}

export async function listPurchaseOrders(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    res.json({ success: true, data: await purchaseService.listPurchaseOrders(req.user.branchId) });
  } catch (error) { next(error); }
}

export async function getPurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    res.json({ success: true, data: await purchaseService.getPurchaseOrder(productIdSchema.parse(req.params.id), req.user.branchId) });
  } catch (error) { next(error); }
}

export async function createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    const order = await purchaseService.createPurchaseOrder(purchaseOrderSchema.parse(req.body), req.user.branchId, req.user.userId);
    await writeAudit(req, 'purchase_order.created', 'purchase_order', order?.purchase_order_id, { supplier_id: req.body.supplier_id });
    res.status(201).json({ success: true, data: order });
  } catch (error) { next(error); }
}

export async function receivePurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    const result = await purchaseService.receivePurchaseOrder(
      productIdSchema.parse(req.params.id),
      goodsReceiptSchema.parse(req.body),
      req.user.branchId,
      req.user.userId,
    );
    await writeAudit(req, 'goods_receipt.created', 'purchase_order', String(req.params.id), result);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}
