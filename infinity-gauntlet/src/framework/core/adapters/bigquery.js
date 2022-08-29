import { BigQuery } from '@google-cloud/bigquery'
// import config from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'BIGQUERY_ADAPTER' })

export let bigQuery = undefined

export function connectBigQuery() {
  Logger.info('Starting BigQuery client')

  bigQuery = new BigQuery()

  Logger.info('BigQuery client started successfully')

  return bigQuery
}

export function closeBigQueryConnection() {
  if (!bigQuery) {
    return null
  }

  bigQuery = undefined

  Logger.warn('BigQuery connection closed due to application termination.')
}
