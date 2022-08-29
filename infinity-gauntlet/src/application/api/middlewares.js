import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'MIDDLEWARES' })

export default function run() {
  Logger.info('Adding authenticator middleware to application.')
}
