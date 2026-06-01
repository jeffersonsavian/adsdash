import Redis from 'ioredis'

// Separate Redis client for general use (not BullMQ — that uses its own connection)
let redisClient: Redis | null = null

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  }
  return redisClient
}
