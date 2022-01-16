/*
0 obter um usuario
1 obter o numero de telefone de um usuario a partir de seu ID
2 obter o endereco do ususario pelo id
*/

//importamos um modulo interno do nodejs

const util = require('util')
const obterEnderecoAsync = util.promisify(obterEndereco)



function obterUsuario() {
    // quando der algum problema chama reject(error)
    // quando for td ok, chamamos o resolve
    return new Promise(function (resolve, reject) {
        setTimeout(function () {

            var a = 1

            if (a == 1) {
                return resolve({
                    id: 1,
                    nome: 'Aladin',
                    nasc: new Date()
                })
            }
            else {
                return reject(new Error('DEU RUIM DE VERDADE'))
            }

        }, 1000);
    })
}

function obterTelefone(idUsuario) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            return resolve({
                telefone: '000000000',
                ddd: 11
            })
        }, 2000);
    })
}

function obterEndereco(idUsuario, callback) {
    setTimeout(() => {
        return callback(null, {
            rua: 'Rua da casa branca',
            numero: '72'
        })
    }, 2000);
}


// adiconar async na funcao e ela retornara uma promisse
async function main() {
    try {

        // capturar o tempo da execução
        console.time('medida-promise')

        const usuario = await obterUsuario()

        // const telefone = await obterTelefone(usuario.id)
        // const endereco = await obterEnderecoAsync(usuario.id)

        const resultados = await Promise.all([
            obterTelefone(usuario.id),
            obterEnderecoAsync(usuario.id)
        ])

        const endereco = resultados[1]
        const telefone = resultados[0]

        console.log( `
            Nome: ${usuario.nome}
            Telefone: (${telefone.ddd}) ${telefone.telefone}
            Endereco: ${endereco.rua}, ${endereco.numero}
        ` )

        console.timeEnd('medida-promise')

    } catch (error) {
        console.error( 'deu ruim', error )
    }
}

main()
    .then(
        console.log( 'executou o then' )
    )
    .catch(
        console.log( 'executou o catch' )
    )

console.log( 'executou o console' )
