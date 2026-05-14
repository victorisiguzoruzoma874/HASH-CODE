import Redis from 'ioredis'
import { logger } from '../utils/logger'

export let redis: Redis

export async function connectRedis(): Promise<void> {
  redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  })

  redis.on('error',   (err) => logger.error('Redis error', err))
  redis.on('connect', ()    => logger.info('Redis connected'))

  await redis.connect()
}

/** Simple cache helper */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const val = await redis.get(key)
  return val ? (JSON.parse(val) as T) : null
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key)
}
