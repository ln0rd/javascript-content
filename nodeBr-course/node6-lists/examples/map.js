const service = require('./service')


async function main() {
    try {
        const results = await service.obterPessoas('b')

        // exemplo usando forEach
        // const names = []
        // results.results.forEach(function (element) {
        //     names.push( element.name )
        // });

        //exemplo usando map
        // const names = results.results.map( function (elemento) {
        //     return elemento.name
        // } )
        // ou pode usar arrow function
        const names = results.results.map( (elements) => elements.name )

        console.log( names )
    } catch (error) {
        console.error( `Retornou um erro: ${error}` )
    }
}


main()
