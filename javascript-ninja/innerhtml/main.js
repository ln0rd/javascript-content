(function () {

    'use strict'

    var div = document.querySelector('[data-js="main"]')

    // se n passar parametro de inserção, irá apenas retornar o conteudo em html
    // do elemento.
    console.log( div.innerHTML )

    //observando que o retorno é somente a string do conteudo
    console.log( Object.prototype.toString.call( div.innerHTML))

    // substitui o conteudo atual
    // div.innerHTML = '<h2>Título 2</h2>'

    // inseri sem excluir o anterios, nesse caso é sempre apos o anterior
    div.innerHTML += '<h2>Título 2</h2>'

})()
