import config from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'
import Redis from 'ioredis'

const Logger = createLogger({ name: 'REDIS_ADAPTER' })

let redisStatus = false

export let redisClient = undefined

export function getStatus() {
  return redisStatus && Boolean(redisClient)
}

export function connectRedis() {
  Logger.info('Starting Redis client')

  redisClient = new Redis(config.core.redis.url, { enableOfflineQueue: false })
  redisStatus = true

  redisClient.on('connect', () => {
    Logger.info('Redis client connected')
    redisStatus = true
  })

  redisClient.on('ready', () => {
    Logger.info('Redis client started successfully')
    redisStatus = true
  })

  redisClient.on('error', err => {
    Logger.error('Error during Redis connection: %s', err.message)
    redisStatus = false
  })

  return redisClient
}

export function quitRedis() {
  if (!redisClient) {
    return null
  }

  redisClient.quit()
  redisClient = undefined

  Logger.warn('Redis connection closed due to application termination.')
}
