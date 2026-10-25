import * as saleRepository from '../repositories/saleRepository';
import { SaleInput } from '../schemas/saleSchema';
import { SalesHistoryQuery } from '../schemas/salesHistorySchema';

export function createSale(data: SaleInput) {
  return saleRepository.createSale(data);
}

export function listSales(query: SalesHistoryQuery) {
  return saleRepository.listSales(query);
}
