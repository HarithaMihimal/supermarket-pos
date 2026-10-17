import * as productRepository from '../repositories/productRepository';
import { ProductInput } from '../schemas/productSchema';
import { AppError } from '../utils/AppError';

export async function listProducts(search?: string, categoryId?: number) {
  return productRepository.listProducts(search, categoryId);
}

export async function listCategories() {
  return productRepository.listCategories();
}

export async function createProduct(data: ProductInput) {
  return productRepository.createProduct(data);
}

export async function updateProduct(
  id: number,
  data: ProductInput
) {
  const product = await productRepository.updateProduct(id, data);

  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  return product;
}