import * as inventoryRepository from '../repositories/inventoryRepository';
import { InventoryAdjustmentInput } from '../schemas/inventorySchema';

export function listInventory(search?: string, lowStockOnly = false, branchId = 1) {
  return inventoryRepository.listInventory(search, lowStockOnly, branchId);
}

export function adjustInventory(data: InventoryAdjustmentInput) {
  return inventoryRepository.adjustInventory(data);
}
