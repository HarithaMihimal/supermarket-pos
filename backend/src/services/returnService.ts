import * as returnRepository from '../repositories/returnRepository';
import { AuthorizedReturnInput } from '../schemas/returnSchema';
import { AppError } from '../utils/AppError';

export async function getReturnableSale(saleId: number, branchId: number) {
  const sale = await returnRepository.getReturnableSale(saleId, branchId);
  if (!sale) throw new AppError(404, 'Receipt not found');
  return sale;
}

export function createReturn(data: AuthorizedReturnInput) {
  return returnRepository.createReturn(data);
}
