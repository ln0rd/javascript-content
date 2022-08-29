import createLogger from 'framework/core/adapters/logger'
import { middleware as i18nMiddleware } from 'framework/core/adapters/i18n'

const Logger = createLogger({ name: 'MIDDLEWARES' })

export default function run(server) {
  Logger.info('Adding i18n middleware to application.')

  server.pre(i18nMiddleware)
}
