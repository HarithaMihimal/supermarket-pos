import * as saleRepository from '../repositories/saleRepository';
import { AuthorizedSaleInput } from '../schemas/saleSchema';
import { SalesHistoryQuery } from '../schemas/salesHistorySchema';
import { AppError } from '../utils/AppError';

export function createSale(data: AuthorizedSaleInput) {
  return saleRepository.createSale(data);
}

export function listSales(query: SalesHistoryQuery) {
  return saleRepository.listSales(query);
}

export async function getSaleDetails(saleId: number, branchId: number) {
  const sale = await saleRepository.getSaleDetails(saleId, branchId);
  if (!sale) throw new AppError(404, 'Sale not found');
  return sale;
}
