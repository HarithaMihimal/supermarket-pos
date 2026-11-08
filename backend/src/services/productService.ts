import * as productRepository from '../repositories/productRepository';
import { CategoryInput, ProductInput } from '../schemas/productSchema';
import { ProductImportRow } from '../schemas/productImportSchema';
import { AppError } from '../utils/AppError';

export async function listProducts(branchId: number, search?: string, categoryId?: number) {
  return productRepository.listProducts(branchId, search, categoryId);
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

export async function createProduct(data: ProductInput, branchId: number) {
  return productRepository.createProduct(data, branchId);
}

export async function importProducts(rows: ProductImportRow[], branchId: number, importedBy?: number, fileName?: string) {
  return productRepository.importProducts(rows, branchId, importedBy, fileName);
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

export async function removeProduct(id: number) {
  const product = await productRepository.removeProduct(id);
  if (!product) {
    throw new AppError(404, 'Product not found');
  }
  return product;
}