import * as productRepository from '../repositories/productRepository';
import { CategoryInput, ProductInput } from '../schemas/productSchema';
import { AppError } from '../utils/AppError';

export async function listProducts(search?: string, categoryId?: number) {
  return productRepository.listProducts(search, categoryId);
}

export async function listCategories() {
  return productRepository.listCategories();
}

export async function createCategory(data: CategoryInput) {
  return productRepository.createCategory(data);
}

export async function updateCategory(id: number, data: CategoryInput) {
  return productRepository.updateCategory(id, data);
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