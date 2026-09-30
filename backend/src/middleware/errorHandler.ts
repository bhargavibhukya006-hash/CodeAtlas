import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Operational errors (known)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
        name: err.constructor.name,
      },
    });
    return;
  }

  // SyntaxError from body-parser
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: {
        message: 'Invalid JSON payload received in request body',
        statusCode: 400,
      },
    });
    return;
  }

  // Log unexpected errors
  console.error('[Unhandled Internal Error]:', err);

  res.status(500).json({
    error: {
      message: err.message || 'Internal server error occurred',
      statusCode: 500,
    },
  });
}
