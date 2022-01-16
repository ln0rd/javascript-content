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

            if ( a == 1) {
                return resolve({
                    id: 1,
                    nome: 'Aladin',
                    nasc: new Date()
                })
            }
            else {
                return reject( new Error('DEU RUIM DE VERDADE') )
            }

        }, 1000);
    })
}

function obterTelefone(idUsuario) {
    return new Promise( function (resolve, reject) {
        setTimeout(function () {
            return resolve({
                telefone: '000000000',
                ddd: 11
            })
        }, 2000);
    } )
}

function obterEndereco(idUsuario, callback) {
    setTimeout(() => {
        return callback(null, {
            rua: 'Rua da casa branca',
            numero: '72'
        })
    }, 2000);
}

const usuarioPromise = obterUsuario()
// para manipular o sucesso usamos a funcao .then
// para manipular erros usamos o .catch
usuarioPromise
    .then( function (resultado) {
        return obterTelefone( resultado.id )
        .then( function resolverTelefone(result) {
            return {
                usuario: {
                    nome: resultado.nome,
                    id: resultado.id
                },
                telefone: result
            }
        } )
    } )
    .then( function (resultado) {
        const endereco = obterEnderecoAsync(resultado.usuario.id)
        return endereco.then( function resolveEndreco(result) {
            return {
                usuario: resultado.usuario,
                telefone: resultado.telefone,
                endereco: result
            }
        } )
    } )

    .then( function (resultado) {
        console.log( 'resultado: ', resultado )
    })
    .catch( function (error) {
        console.error('deu ruim', error)
    } )
