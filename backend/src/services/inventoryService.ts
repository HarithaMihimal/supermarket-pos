import * as inventoryRepository from '../repositories/inventoryRepository';
import { InventoryAdjustmentInput } from '../schemas/inventorySchema';

export function listInventory(branchId: number, search?: string, lowStockOnly = false) {
  return inventoryRepository.listInventory(branchId, search, lowStockOnly);
}

export function adjustInventory(data: InventoryAdjustmentInput, branchId: number) {
  return inventoryRepository.adjustInventory(data, branchId);
}
