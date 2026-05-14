import type { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { AppError } from './errorHandler'

/** Runs after express-validator chains — returns 422 if any field fails */
export function validate(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    next(new AppError(422, 'Validation failed', 'VALIDATION_ERROR', errors.array()))
    return
  }
  next()
}
