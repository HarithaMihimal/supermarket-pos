import * as inventoryRepository from '../repositories/inventoryRepository';
import type { StockTransferInput } from '../schemas/inventorySchema';

export function listStockTransfers(branchId: number) {
  return inventoryRepository.listStockTransfers(branchId);
}

export function createStockTransfer(data: StockTransferInput, sourceBranchId: number, userId: number) {
  return inventoryRepository.createStockTransfer(data, sourceBranchId, userId);
}
