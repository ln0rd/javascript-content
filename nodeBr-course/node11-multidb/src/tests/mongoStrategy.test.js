const assert = require('assert')
const Mongodb = require('./../db/strategies/mongodb')
const Context = require('./../db/strategies/base/contextStrategy')

const context = new Context(new Mongodb())

describe('MongoDB suite de testes', function() {

    this.beforeAll(async function () {
        await context.connect()
    }())

    it('verificar', async () => {
        const result = await context.isConnected()
        const expected = 'Conectado'

        assert.deepEqual(result, expected)
    })
})

