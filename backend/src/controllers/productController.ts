import { Request, Response, NextFunction } from 'express';
import { categorySchema, productSchema, productIdSchema } from '../schemas/productSchema';
import * as productService from '../services/productService';
import { AppError } from '../utils/AppError';
import { writeAudit } from '../utils/audit';

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const categoryId = req.query.category_id
      ? productIdSchema.parse(req.query.category_id)
      : undefined;
    res.json({ success: true, data: await productService.listProducts(search, categoryId) });
  } catch (error) {
    next(error);
  }
}

export async function listCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await productService.listCategories() });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = productSchema.parse(req.body);

    const product = await productService.createProduct(data);
    await writeAudit(req, 'product.created', 'product', product.product_id, { name: product.name });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = productIdSchema.parse(req.params.id);
    const data = productSchema.parse(req.body);

    const product = await productService.updateProduct(id, data);
    await writeAudit(req, 'product.updated', 'product', id, { name: product.name });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await productService.createCategory(categorySchema.parse(req.body));
    await writeAudit(req, 'category.created', 'category', category.category_id, { name: category.name });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = productIdSchema.parse(req.params.id);
    const category = await productService.updateCategory(id, categorySchema.parse(req.body));
    if (!category) throw new AppError(404, 'Category not found');
    await writeAudit(req, 'category.updated', 'category', id, { name: category.name });
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}