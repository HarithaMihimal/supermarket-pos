import * as saleRepository from '../repositories/saleRepository';
import { AuthorizedSaleInput } from '../schemas/saleSchema';
import { SalesHistoryQuery } from '../schemas/salesHistorySchema';

export function createSale(data: AuthorizedSaleInput) {
  return saleRepository.createSale(data);
}

export function listSales(query: SalesHistoryQuery) {
  return saleRepository.listSales(query);
}
