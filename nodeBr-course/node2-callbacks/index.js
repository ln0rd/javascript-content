/*
0 obter um usuario
1 obter o numero de telefone de um usuario a partir de seu ID
2 obter o endereco do ususario pelo id
*/

function obterUsuario(callback) {
    setTimeout( function () {
        return callback(null, {
            id: 1,
            nome: 'Aladin',
            nasc: new Date()
        })
    }, 1000);
}

function obterTelefone(idUsuario, callback) {
    setTimeout(function () {
        return callback( null, {
            telefone: '000000000',
            ddd: 11
        })
    }, 2000);
}

function obterEndereco(idUsuario, callback) {
    setTimeout(() => {
        return callback( null, {
            rua: 'Rua da casa branca',
            numero: '72'
        })
    }, 2000);
}

function resolverUsuario(erro, usuario) {
    console.log( 'usuario: ' , usuario )
}

obterUsuario(function resolverUsuario(error, usuario) {
    // tudo que for null || "" ou 0 sera igual a false
    if( error ){
        console.error('Deu ruim em usuario', error)
        return
    }

    obterTelefone( usuario.id, function resolverTelefone(error1 , telefone) {
        if ( error1 ) {
            console.error('Deu ruim em Telefone', error1)
            return
        }

        obterEndereco( usuario.id, function resolverEndereco(error2, endereco) {
            if ( error2 ) {
                console.error('deu ruim o endereco', error2)
                return
            }

            // console esta dentro de endereço pois o escopo de todas as variaveis é visivel aqui
            console.log(`
            Nome: ${usuario.nome},
            Endereco: ${endereco.rua}, ${endereco.numero},
            Telefone: ${telefone.telefone}
            `)
        })
    })

    console.log( usuario )

})
// const telefone = obterTelefone(usuario.id)

// console.log(usuario)
// console.log(telefone)
