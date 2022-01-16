const assert = require('assert')
const service = require('./service')

describe('Star Wars Testes', function () {
    it('deve buscar o r2d2 com o formato correto' , async function () {
        const expected = [ { nome: 'R2-D2', peso: '96'} ]
        const nomeBase = `r2-d2`
        const resultado = await service.getPerson(nomeBase)

        assert.deepEqual(resultado, expected)

    })
})
