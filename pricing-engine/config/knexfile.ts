import { Knex } from 'knex'

const knexConfig: Knex.Config = {
  client: 'pg',
  debug: process.env.NODE_ENV !== 'production',
  connection: {
    host: process.env.hostname,
    database: process.env.database,
    user: process.env.username,
    password: process.env.password,
    timezone: 'UTC',
  },
  migrations: {
    directory: '../migrations',
    tableName: 'db_migrations',
  },
  seeds: {
    directory: '../seeds',
  },
}

export default knexConfig
