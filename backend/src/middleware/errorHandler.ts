import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // PostgreSQL error codes
  const dbError = err as { code?: string; constraint?: string };

  if (dbError.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A product with this barcode already exists',
    });
  }

  if (dbError.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced category does not exist',
    });
  }

  console.error('Unexpected error:', err);

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}