import I18nAdapter from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import { connectQueue } from 'framework/core/adapters/queue'
import ValidatorAdapter from 'framework/core/adapters/validator'
import { connectDatabase } from 'framework/core/adapters/database'
import { connectBigQuery } from 'framework/core/adapters/bigquery'
import { connectRedis } from 'framework/core/adapters/redis'
import ApplicationInitializer from 'application/core/initializer.js'
import { waitForIstio } from 'application/core/helpers/istio'

const Logger = createLogger({ name: 'INITIALIZER' })

export default async function run(opts = {}) {
  await waitForIstio()
  await I18nAdapter()
  await ValidatorAdapter()
  await ApplicationInitializer()

  const disabledDatabases = opts.disabledDatabases || {}

  if (!disabledDatabases.mongodb) {
    await connectDatabase()
  } else {
    Logger.info('mongodb-is-disabled')
  }

  if (!disabledDatabases.rabbitmq) {
    await connectQueue()
  } else {
    Logger.info('rabbitmq-is-disabled')
  }

  if (!disabledDatabases.redis) {
    await connectRedis()
  } else {
    Logger.info('redis-is-disabled')
  }

  if (!disabledDatabases.bigQuery) {
    await connectBigQuery()
  } else {
    Logger.info('bigquery-is-disabled')
  }
}
