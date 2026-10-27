import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export function errorHandler(
  err: unknown,
  req: Request,
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
      message: dbError.constraint === 'users_email_key'
        ? 'An account with this email already exists'
        : 'A record with the same unique value already exists',
    });
  }

  if (dbError.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced category does not exist',
    });
  }

  console.error(JSON.stringify({
    event: 'http_error',
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  }));

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    request_id: req.requestId,
  });
}