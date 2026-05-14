import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// Singleton — prevents multiple connections in dev hot-reload
export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect()
  logger.info('Prisma connected to PostgreSQL')
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}
