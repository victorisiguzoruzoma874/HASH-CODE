import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error:   err.message,
      code:    err.code,
      details: err.details,
    })
    return
  }

  // Prisma unique constraint
  if ((err as any).code === 'P2002') {
    res.status(409).json({ error: 'Resource already exists', code: 'DUPLICATE' })
    return
  }

  // Prisma not found
  if ((err as any).code === 'P2025') {
    res.status(404).json({ error: 'Resource not found', code: 'NOT_FOUND' })
    return
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack })
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' })
}
