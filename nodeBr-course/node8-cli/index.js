const commander = require('commander')
const database = require('./service')
const Heroi = require('./heroi')

async function main() {
    commander
        .version('v1')

        .option('-n, --nome [value]', 'Nome do Heroi')
        .option('-p, --poder [value]', 'Poder do heroi' )
        .option('-c, --cadastrar' , 'Cadastrar um heroi')
        .option('-l, --listar [value]', 'Listar Herois Cadastrados')
        .option('-r, --remover [value]', 'Remove Heroi pelo id')
        .option('-a, --atualizar [value]', 'Atualiza Heroi pelo id')

        .parse(process.argv)

    const heroi = new Heroi(commander)

    try {
        if (commander.cadastrar) {
            delete heroi.id
            const resultado = await database.casdastrar(heroi)
            if (!resultado) {
                console.error( 'Heroi não foi cadastrado!' )
                return
            }
            console.log('Heroi cadastrado!')
        }

        if (commander.listar) {
            const info = await database.listar(heroi.id)
            if (!info) {
                console.error( 'Heroi não existe' )
            }
            console.log( info )
        }

        if (commander.remover) {
            const res = await database.remover(heroi.id)
            if (!res) {
                console.error('Erro ao remover Heroi')
                return
            }
            console.log('Heroi removido!')
        }

        if (commander.atualizar) {
            const idAtt = parseInt(commander.atualizar)
            //remover todas as chaves que tiverem undefined
            const dado = JSON.stringify(heroi)
            const heroiAtualizar = JSON.parse(dado)
            const resultado = await database.atualizar(idAtt, heroiAtualizar)
            if (!resultado) {
                console.error( 'Não foi possivel atualizar o heroi' )
                return
            }
            console.log('Heroi atualizado com sucesso')
        }

    } catch (error) {
        console.error( 'Ocorreu um erro: ', error )
    }
}

main()
