import * as purchaseRepository from '../repositories/purchaseRepository';
import { GoodsReceiptInput, PurchaseOrderInput, SupplierInput } from '../schemas/purchaseSchema';
import { AppError } from '../utils/AppError';

export const listSuppliers = () => purchaseRepository.listSuppliers();
export const createSupplier = (data: SupplierInput) => purchaseRepository.createSupplier(data);
export const listPurchaseOrders = (branchId: number) => purchaseRepository.listPurchaseOrders(branchId);
export const getPurchaseOrder = async (id: number, branchId: number) => {
  const order = await purchaseRepository.getPurchaseOrder(id, branchId);
  if (!order) throw new AppError(404, 'Purchase order not found');
  return order;
};
export const createPurchaseOrder = (data: PurchaseOrderInput, branchId: number, userId: number) =>
  purchaseRepository.createPurchaseOrder(data, branchId, userId);
export const receivePurchaseOrder = (id: number, data: GoodsReceiptInput, branchId: number, userId: number) =>
  purchaseRepository.receivePurchaseOrder(id, data, branchId, userId);
