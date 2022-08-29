import * as pino from 'pino'

const isProdEnv = process.env.NODE_ENV === 'production'

const logger = pino({
  prettyPrint: !isProdEnv,
})

export default logger
