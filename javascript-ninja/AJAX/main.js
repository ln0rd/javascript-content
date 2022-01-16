(function (win, doc) {
    'use strict'

    // instancia objeto para realizar a requisição
    var ajax = new XMLHttpRequest()

    // abre a requisição com o tipo e o caminho do arquivo
    // aparece no network da pagina
    // ajax.open('get', '/')
    // ajax.open('get', 'main.js')
    ajax.open('get', 'data/data.json')

    //
    ajax.send()

    // pode ser feito assim para escutar a mudança
    ajax.onreadystatechange = function() {

    }

    // ou

    ajax.addEventListener( 'readystatechange', function () {

        if (isRequestOk()) {

            var data = JSON.parse(ajax.response)

            console.log( 'requisição ok' )
            // console.log( 'conteudo: ' + ajax.responseText )
            console.log( 'conteudo: ' + data.message )
            // disparando erro:
            // throw new Error ('Mensagem de erro');
            try {
                throw new Error ('Deu erro')
            } catch (error) {
                console.log(error);
            }

        }
        else{
            console.log( 'deu problema' )
        }

        console.log( 'terminou requisição' )
        console.log( ajax.readyState )
        console.log( ajax.status )

    }, false )


    // readyState,
    // 0: não enviado, requisão não realizada (b.o no open)
    // 1: apos abrir a conexão (conexão aberta, o executado o open)
    // 2: headers recebidos, cabeçalhos da conexão (oq esta sendo recebido, infos sobre arquivos)
    // 3: Carregando o conteudo/corpo do request
    // 4: concluido com sucesso, incluiu a requisição com sucesso

    function isRequestOk() {
        return ajax.readyState === 4 && ajax.status === 200 ? true : false
    }

})(window, document)
