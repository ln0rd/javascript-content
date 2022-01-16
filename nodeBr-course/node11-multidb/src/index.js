const ContextStrategy = require('./db/strategies/base/contextStrategy')
const Mongodb = require('./db/strategies/mongodb')
const Postgres = require('./db/strategies/postgres')

const contextMongo = new ContextStrategy(new Mongodb())
contextMongo.create()
// contextMongo.read()

const contextPostgres = new ContextStrategy(new Postgres())
contextPostgres.create()
