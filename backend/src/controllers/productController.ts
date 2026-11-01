import { Request, Response, NextFunction } from 'express';
import { categorySchema, productSchema, productIdSchema } from '../schemas/productSchema';
import * as productService from '../services/productService';
import { AppError } from '../utils/AppError';
import { writeAudit } from '../utils/audit';
import { productImportRowSchema } from '../schemas/productImportSchema';

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

export async function removeProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const id = productIdSchema.parse(req.params.id);
    const product = await productService.removeProduct(id);
    await writeAudit(req, 'product.removed', 'product', id, { name: product.name });
    res.json({ success: true, message: 'Product removed from the active catalog' });
  } catch (error) {
    next(error);
  }
}

function parseCsvRow(line: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  if (quoted) throw new AppError(400, 'CSV contains an unclosed quoted value');
  values.push(value.trim());
  return values;
}

export async function importProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = typeof req.body === 'string' ? req.body.replace(/^\uFEFF/, '').trim() : '';
    if (!csv) throw new AppError(400, 'CSV file is empty');
    const lines = csv.split(/\r?\n/).filter(line => line.trim());
    const headers = parseCsvRow(lines[0]).map(header => header.toLowerCase());
    const requiredHeaders = ['name', 'barcode', 'category', 'cost_price', 'selling_price'];
    const missing = requiredHeaders.filter(header => !headers.includes(header));
    if (missing.length) throw new AppError(400, `CSV is missing required columns: ${missing.join(', ')}`);

    const rows = lines.slice(1).map((line, index) => {
      const values = parseCsvRow(line);
      if (values.length !== headers.length) {
        throw new AppError(400, `CSV row ${index + 2} has an incorrect number of columns`);
      }
      const raw = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]]));
      const parsed = productImportRowSchema.safeParse(raw);
      if (!parsed.success) {
        throw new AppError(400, `CSV row ${index + 2}: ${parsed.error.issues[0].message}`);
      }
      return parsed.data;
    });
    if (!rows.length) throw new AppError(400, 'CSV has no product rows');

    const result = await productService.importProducts(rows, req.user?.userId, req.header('x-file-name'));
    await writeAudit(req, 'products.imported', 'product', undefined, { count: result.products.length, batch_id: result.batchId });
    res.status(201).json({ success: true, message: `${result.products.length} products imported successfully`, data: result });
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