(function (win, doc) {

    'use strict'

    var name = document.querySelector('.name')
    var key = document.querySelector('.passwords')
    var button = document.querySelector('button')

    //metodo para adicionar um evento no elemento
    button.addEventListener( 'click', function(event){

        //evita o evento padrão do elemento
        event.preventDefault()

        console.log( 'Click no botao' )

    }, false )


    name.addEventListener( 'click', function (event) {
        event.preventDefault()

        name.value = 'Este input foi clicado'

    } )

})(window, document)
