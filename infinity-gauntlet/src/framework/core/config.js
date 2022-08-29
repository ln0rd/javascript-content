import R from 'ramda'
import { join } from 'path'

const {
  NODE_ENV,
  LOG_LEVEL,
  PORT,
  API_DEFAULT_VERSION,
  API_LOG_ALL_REQUESTS_BODY,
  SENTRY_DSN,
  SENTRY_RELEASE,
  SENTRY_NAME,
  SENTRY_ENABLED,
  EMAIL_FROM,
  SENDGRID_API_KEY,
  MONGODB_URL,
  RABBITMQ_URL,
  RABBITMQ_PREFETCH_COUNT,
  RABBITMQ_HEARTBEAT_TIMEOUT,
  MONGODB_CONNECTION_POOL_SIZE,
  SHUTDOWN_TIMEOUT,
  SLACK_FINOPS_WEBHOOK_URL,
  REDIS_URL,
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  MONGODB_CONNECTION_TIMEOUT,
  MONGODB_SOCKET_TIMEOUT,
  LOG_IGNORE_SENSITIVE_FIELDS,
  CORS_ALLOW_LIST,
  RABBITMQ_DELAY_RETRY,
  RABBITMQ_INCREMENT_FACTOR_FOR_DELAY
} = process.env

const RootPath = join(__dirname, '..', '..', '..')

function bool(val) {
  if (!val) {
    return false
  }
  return val === 'true'
}

const Configs = {
  environment: NODE_ENV,
  root_path: RootPath,

  api: {
    version: API_DEFAULT_VERSION,
    cors: {
      origins: CORS_ALLOW_LIST ? CORS_ALLOW_LIST.split(',') : ['*'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['X-Page', 'X-Total-Pages', 'X-Total-Items', 'X-Count']
    },
    server: {
      name: 'InfinityGauntlet',
      port: PORT || 5000,
      shutdownTimeout: SHUTDOWN_TIMEOUT || 5000
    },
    logAllRequestsBody: Boolean(API_LOG_ALL_REQUESTS_BODY),
    logIgnoreSensitiveFields: LOG_IGNORE_SENSITIVE_FIELDS
      ? LOG_IGNORE_SENSITIVE_FIELDS.split(',')
      : ['password', 'new_password', 'current_password']
  },

  core: {
    logger: {
      level: LOG_LEVEL
    },
    i18n: {
      defaultLocale: 'pt-br',
      locales: ['pt-br'],
      extension: '.json',
      objectNotation: true,
      updateFiles: false,
      directory: join(RootPath, 'src', 'application', 'core', 'locales')
    },
    errorReporter: {
      dsn: SENTRY_DSN,
      options: {
        environment: NODE_ENV,
        name: SENTRY_NAME,
        release: SENTRY_RELEASE,
        captureUnhandledRejections: true
      },
      enabled: bool(SENTRY_ENABLED)
    },
    mongodb: {
      uri: MONGODB_URL,
      opts: {
        poolSize: MONGODB_CONNECTION_POOL_SIZE || 10, // Maintain up to x socket connections
        bufferMaxEntries: 0, // If not connected, return errors immediately rather than waiting for reconnect
        keepAlive: true,
        connectTimeoutMS: MONGODB_CONNECTION_TIMEOUT || 30000,
        socketTimeoutMS: MONGODB_SOCKET_TIMEOUT || 360000,
        ssl: true,
        sslValidate: true,
        // (node:10095) DeprecationWarning: current URL string parser is deprecated, and will be removed in a future version.
        // To use the new parser, pass option { useNewUrlParser: true } to MongoClient.connect.
        useNewUrlParser: true,
        // (node:10095) [MONGODB DRIVER] Warning: Current Server Discovery and Monitoring engine is deprecated, and will be removed in a future version.
        // To use the new Server Discover and Monitoring engine, pass option { useUnifiedTopology: true } to the MongoClient constructor.
        useUnifiedTopology: true
      }
    },
    redis: {
      url: REDIS_URL
    },
    slack: {
      finops: {
        url: SLACK_FINOPS_WEBHOOK_URL
      }
    }
  },

  mailer: {
    // FIXME: Not sure if default value is a typo
    // FIXME: mailer.spec relies on this hard-coded default value
    from: EMAIL_FROM || 'Hashlab <no-reply@hashlab.com.br',
    credentials: {
      api_key: SENDGRID_API_KEY
    }
  },

  queue: {
    rabbitmq: {
      uri: RABBITMQ_URL,
      prefetch_count: RABBITMQ_PREFETCH_COUNT || 10,
      heartbeat: RABBITMQ_HEARTBEAT_TIMEOUT || 60,
      delayToRetryInSeconds: RABBITMQ_DELAY_RETRY || 10,
      incrementFactorForDelayAttempts: RABBITMQ_INCREMENT_FACTOR_FOR_DELAY || 10
    }
  },

  aws: {
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
  }
}

if (process.env.NODE_ENV !== 'production') {
  if (!Configs.core.mongodb.uri) {
    Configs.core.mongodb.uri = 'mongodb://localhost:27017/hashlab'
  }
  Configs.core.mongodb.opts = R.omit(
    ['ssl', 'sslValidate', 'sslCA'],
    Configs.core.mongodb.opts
  )

  if (!Configs.queue.rabbitmq.uri) {
    Configs.queue.rabbitmq.uri = 'amqp://guest:guest@localhost:5672/rabbit'
  }
}

export default Configs
