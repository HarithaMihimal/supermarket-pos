import * as saleRepository from '../repositories/saleRepository';
import { SaleInput } from '../schemas/saleSchema';

export function createSale(data: SaleInput) {
  return saleRepository.createSale(data);
}
