(function (params) {

    'use strict'
    //Vai dar o tempo e executa uma vez
    console.log('incio')
    setTimeout( function() {
        console.log( 'espera de 3 segundos -> setTimeout')
    }, 3000);
    console.log('fim')

    // fica em um ciclo onde ira executar a cada quantia de tempo determinado
    setInterval(function () {
        console.log('espera 5 segundos -> setInterval')
    }, 5000);


    var counter = 0
    function timer() {

        console.log( 'timer : ', counter++ )
        setTimeout( timer, 1000 )

    }
    // timer()

}) (window, document)
