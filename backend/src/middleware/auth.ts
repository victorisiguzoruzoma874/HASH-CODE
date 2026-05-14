import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { AppError } from './errorHandler'

export interface AuthRequest extends Request {
  user?: { id: string; address: string; role: string }
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing or invalid authorization header', 'UNAUTHORIZED'))
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string; address: string; role: string
    }
    req.user = { id: payload.sub, address: payload.address, role: payload.role }
    next()
  } catch {
    next(new AppError(401, 'Invalid or expired token', 'TOKEN_INVALID'))
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions', 'FORBIDDEN'))
    }
    next()
  }
}

/** Verify the request comes from our own treasury wallet (for admin ops) */
export async function requireTreasury(
  req: AuthRequest, _res: Response, next: NextFunction,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } })
    if (!user || user.role !== 'ADMIN') {
      return next(new AppError(403, 'Treasury access only', 'FORBIDDEN'))
    }
    next()
  } catch (err) {
    next(err)
  }
}
