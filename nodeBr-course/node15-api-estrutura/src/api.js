const Hapi = require('hapi')
const Context = require('./db/strategies/base/contextStrategy')
const MongoDB = require('./db/strategies/mongodb/mongoDbStrategy')
const HeroSchema = require('./db/strategies/mongodb/schemas/heroSchema')
const HeroRoutes = require('./routes/heroRoutes')

const app = new Hapi.Server({
    port: 5000
})

function mapRoutes(instance, methods) {
    return methods.map(method => instance[method]())
}

async function main() {

    const connection = MongoDB.connect()
    const mongoDb = new Context(new MongoDB(connection, HeroSchema))

    app.route([
        ...mapRoutes(new HeroRoutes(mongoDb), HeroRoutes.methods())
    ])

    await app.start()
    console.log('server running at', app.info.port)

    return app;
}
module.exports = main()
