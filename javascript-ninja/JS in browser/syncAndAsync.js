(function () {

    'use strict'


    //modo Sincrono
    console.log( 'a 1' )
    console.log( 'a 2' )
    console.log( 'a 3' )



    // //modo asyncrono
    // console.log( 0 )

    // for( var i = 1; i< 10; i++ ){

    //     console.log(i)

    // }
    // console.log( 11 )

    console.log( 'inicio' )

    // QUANDO EXECUTAMOS O EVENTLISTENER ELE EXECUTA EXECUTA OS DOIS CONSOLES MAS O ADDEVENTLISTENER
    // ELE FICA EM UMA THREAD SEPARADA EXECUTANDO

    document.addEventListener('click' , function (event) {
        console.log('clicou no documento')
    } , false)

    console.log( 'fim' )

})(window,document)
