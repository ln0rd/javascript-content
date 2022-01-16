const assert = require('assert')
const Postgres = require('./../db/strategies/postgres')
const Context = require('./../db/strategies/base/contextStrategy')

const context = new Context(new Postgres())
const MOCK_HEROI_CADASTRAR = { nome: 'Shoto Todoroki', poder: 'Meio quente Meio Frio' }
const MOCK_HEROI_ATUALIZAR = { nome: 'Shota Aizawa', poder: 'Apagar Individualidade' }


describe('Postgres Strategy', function () {
    this.timeout(Infinity)

    before(async function () {
        await context.connect()
        await context.create(MOCK_HEROI_ATUALIZAR)
    })

    it('Postgres SQL Connection', async () => {
        const result = await context.isConnected()
        assert.equal(result, true)
    })

    it('cadastrar', async function () {
        const result = await context.create(MOCK_HEROI_CADASTRAR)
        delete result.id
        assert.deepEqual(result, MOCK_HEROI_CADASTRAR)
    })

    it('listar', async function(){
        const [result] = await context.read({nome: MOCK_HEROI_CADASTRAR.nome, poder: MOCK_HEROI_CADASTRAR.poder})
        // pegar primeira posição
        // const pocisaoZero = result[0]
        delete result.id
        assert.deepEqual(result, MOCK_HEROI_CADASTRAR)
    })

    it('atualizar', async function () {
        const [itemAtualizar] = await context.read({ nome: MOCK_HEROI_ATUALIZAR.nome, poder: MOCK_HEROI_ATUALIZAR.poder})
        const novoItem = {
            ...MOCK_HEROI_ATUALIZAR,
            nome: 'All Might'
        }
        const [result] = await context.update(itemAtualizar.id, novoItem)
        // no js temos uma tecnica chamada rest/spread que é um meotodo usado para mergear objetos
        // ou separa-los
        const [itemAtualizado] = await context.read({id: itemAtualizar.id})
        assert.deepEqual(result, 1)
        assert.deepEqual(itemAtualizado.nome, novoItem.nome)
    })

    it('remover por id', async function () {
        const [item] = await context.read({})
        const result = await context.delete(item.id)
        assert.deepEqual(result, 1)
    })
})
