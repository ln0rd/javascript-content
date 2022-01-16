const service = require('./service')

async function timefor() {
    try {
        const result = await service.obterPessoas('a')
        const names = []
        //verificando o tempo
        console.time( 'for' )
        for( let i = 0 ; i <= result.results.length - 1 ; i++ ){
            var pessoa = result.results[i]
            names.push(pessoa.name)
        }
        console.timeEnd('for')
        // console.log( names )
    } catch (error) {
        console.error(`Ocorreu um Erro: ${error}`)
    }
}


async function timeForin() {
    try {
        const result = await service.obterPessoas('darth')
        const names = []

        console.time( 'forin' )
        for( let i in result.results ){
            const pessoa = result.results[i]
            names.push( pessoa.name )
        }

        console.timeEnd('forin')
        // console.log( names )
    } catch (error) {
        console.log( `Ocorreu um erro: ${error}` )
    }
}


async function timeForof() {
    try {
        const result = await service.obterPessoas('darth')
        const names = []

        console.time( 'forof' )
        for (let pessoa of result.results) {
            names.push(pessoa.name)
        }

        console.timeEnd('forof')
        // console.log(names)
    } catch (error) {
        console.log(`Ocorreu um erro: ${error}`)
    }
}


// execução das funções

timefor()
timeForin()
timeForof()
