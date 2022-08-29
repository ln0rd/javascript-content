import AWS from 'aws-sdk'
import config from 'framework/core/config'
import appConfig from 'application/core/config'
import createLogger from 'framework/core/adapters/logger'
import { redisClient } from 'framework/core/adapters/redis'

const Logger = createLogger({ name: 'INVALIDATE_CLOUDFRONT_CACHE' })

export function createInvalidation(cloudFrontId, params = {}) {
  const cloudfront = new AWS.CloudFront(config.aws)
  const items = ['/*']

  params = Object.assign(params, {
    DistributionId: cloudFrontId,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {
        Quantity: items.length,
        Items: items
      }
    }
  })

  Logger.info(`Invalidating distribution ${cloudFrontId}`)
  return cloudfront.createInvalidation(params).promise()
}

export async function s3GetHashboardFile(filename) {
  if (['development', 'test'].includes(config.environment)) {
    if (filename.includes('url')) {
      const content = require('../../../../test/mocks/url.index.json')
      return content
    }

    if (filename.includes('admin')) {
      const content = require('../../../../test/mocks/admin.config.json')
      return content
    }
  }

  let content = await redisClient.get(filename)

  if (content) {
    return JSON.parse(content)
  }

  const s3 = new AWS.S3(config.aws)
  const params = { Bucket: 'hashboard-assets', Key: filename }
  const response = await s3.getObject(params).promise()

  content = response.Body.toString('utf8')
  await redisClient.set(
    filename,
    content,
    'EX',
    appConfig.hashboard.config.cache_expires_in
  )

  return JSON.parse(content)
}
