import { Request, Response, NextFunction } from 'express';
import { productSchema, productIdSchema } from '../schemas/productSchema';
import * as productService from '../services/productService';

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = productSchema.parse(req.body);

    const product = await productService.createProduct(data);

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

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}