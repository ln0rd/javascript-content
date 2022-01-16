const { obterPessoas } = require('./service')

async function main() {
    try {
        const { results } = await obterPessoas('a')
        console.log( results )
        const pesos = results.map( element => parseInt(element.height) )
        console.log( pesos )
        const total = pesos.reduce( (prev, next) => {
            return prev + next
        } )

        console.log( `Total de pesos: ${total}` )

    } catch (error) {
        console.error(`Ocorreu um erro: ${error}`)
    }
}

main()
