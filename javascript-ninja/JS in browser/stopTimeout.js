(function (win, doc) {

    'use strict'

    var counter = 0
    var button = doc.querySelector('[data-btn-cancel]')
    var text = doc.querySelector('p')
    var buttonres = doc.querySelector('[data-btn-restart]')
    var buttonzero = doc.querySelector('[data-btn-to-zero]')
    var temporizador = 0

    function timer() {
        text.innerHTML = counter
        console.log( counter++ )

        temporizador = setTimeout( timer, 2000 )

    }
    timer()

    button.addEventListener( 'click', function (event) {
        event.preventDefault()
        clearTimeout(temporizador)
    }, false )

    buttonres.addEventListener( 'click', function (event) {
        event.preventDefault()
        timer()
    })

    buttonzero.addEventListener( 'click', function (ev) {
        ev.preventDefault()
        clearTimeout(temporizador)
        counter = 0
        timer()
    } )


})(window, document)
