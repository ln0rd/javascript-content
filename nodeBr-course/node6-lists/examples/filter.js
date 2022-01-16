// traz somente da familia lars

const { obterPessoas } = require('./service')


async function main() {
    try {
        const { results } = await obterPessoas('a')

        const familyLars = results.filter( function (element) {
            // por padrão precisa retornar um booleano
            // para informar se deve manter ou remover da lista
            // false > remove da lista
            // true > mantem
            // não encontrou indexof = -1
            // encontrou indexof = posição no Array
            const result = element.name.toLowerCase().indexOf('lars') !== -1
            return result
        } )

        const names = familyLars.map( (pessoa) => pessoa.name )
        console.log( names )

    } catch (error) {
        console.error( `Ocorreu um erro:  ${error}` )
    }
}


main()
