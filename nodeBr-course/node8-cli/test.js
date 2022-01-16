const { deepEqual, ok } = require('assert')
const database = require('./service')

const DEFAULT_ITEM_CADASTRAR = {
    nome: 'Flash',
    poder: 'Speed',
    id: 1
}


const DEFAULT_ITEM_ATUALIZAR = {
    nome: 'Lanterna Verde',
    poder: 'Energia do Anel',
    id: 2
}


describe('Suite de manipulação de Herois', () =>{
    // Before( async () => {
    //     await database.casdastrar(DEFAULT_ITEM_CADASTRAR)
    // } )

    it('Deve pesquisar um heroi' , async () => {
        const expected = DEFAULT_ITEM_CADASTRAR
        // para evitar ter que fazer resultado[0] poderia receber o retorno do array desta maneira
        // const [resultado] = await database.listar(expected.id)
        const resultado = await database.listar(expected.id)
        const posicaoUm = resultado[0]

        deepEqual( posicaoUm , expected )
    })

    it('Deve casdastrar um heroi, usando arquivos', async () => {
        const expected = DEFAULT_ITEM_CADASTRAR
        const resultado = await database.casdastrar(DEFAULT_ITEM_CADASTRAR)
        const [actual] = await database.listar(DEFAULT_ITEM_CADASTRAR.id )
        //
        deepEqual( actual , expected )
    })

    it('Dever Remover um heroi por id', async ()=> {
        const expected = true;
        const resultado = await database.remover( DEFAULT_ITEM_CADASTRAR.id )

        deepEqual( resultado , expected )
    })

    it.only('Deve Atualizar um heroi por id', async () => {
        const expected ={ ...DEFAULT_ITEM_ATUALIZAR,
        nome: 'Batman',
        poder: 'Dinheiro e Inteligencia'
        }

        const novoDado = {
            nome: 'Batman',
            poder: 'Dinheiro e Inteligencia'
        }

        await database.atualizar(DEFAULT_ITEM_ATUALIZAR.id, novoDado )
        const resultado = await database.listar(DEFAULT_ITEM_ATUALIZAR.id)
        deepEqual( resultado , expected )

    })
})
