(function (win, doc) {
    log = console.log



    'use strict'



    function listener(event, element, callback) {
        doc.querySelector(element)
            .addEventListener( event, callback, false )

    }

    function noListener(event, element, callback) {
        doc.querySelector(element)
            .removeEventListener( event, callback, false )
    }

    listener('click', '[data-js="link"]', message )
    listener('click', '[data-js="div"]', message )
    noListener('click', '[data-js="link"]', message )

    function message() {
        alert('Foi realizado o clique')
        event.stopPropagation()
    }


    // TODO O TRECHO DE CODIGO ABAIXO FOI SUBSTITUIDO PELO DE CIMA
    // ABAIXO: O TRUE FUNCIONA IMPEDINDO A PROPAGAÇÃO DE EVENTO


    // var a = doc.querySelector('[data-js="link"]')
    // var div = doc.querySelector('[data-js="div"]')

    // div.addEventListener( 'click', function (event) {
    //     alert('clicou na div')
    // } ,false )

    // a.addEventListener( 'click', function (event) {
    //     event.preventDefault()
    //     alert('tu clicou no link')
    // }, true  )

})(window, document)
