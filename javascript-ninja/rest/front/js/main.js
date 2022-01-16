(function () {

    'use strict'

    var ajax = new XMLHttpRequest()

    // ajax.open( 'GET' , 'http://localhost:8000/pessoa/kley' )
    // ajax.send()
    // ajax.addEventListener('readystatechange', function () {
    //     if (ajax.readyState === 4 && ajax.status === 200 ) {
    //         console.log( ajax.response )
    //     }
    // }, false)

    ajax.open( 'POST' , 'http://localhost:8000/people' )
    // quando for post precisa passar o header
    ajax.setRequestHeader('Content-Type' , 'application/x-www-form-urlencoded')
    ajax.send('username=keanu&age=54')
    ajax.onreadystatechange = function (params) {
        if (ajax.readyState == 4) {
            // console.log( 'usuario cadastrado!', ajax.status )
            console.log( 'Resposta: ' + ajax.response )
        }
    }

})()
