(function (win, doc) {

    'use strict'


    //o metodo call permite vc passar o this para dentro do escopo da função
    // quando se utiliza new function vc cria um escopo separado
    // então usando function.call() vc passa o escopo global para dentro da função.

    function funName(a,b,c) {
        return this.lastName
    }

    var obj = {
        lastName: 'leo'
    }

    var obj2 = {
        lastName: 'Bufalo'
    }

    // var myname = new funName()
    // myname.lastName = 'leo'

    // passo o obj ou obj2 como this e ele consegue visualizar o indice lastName
    console.log( funName.call( obj2 ) )

})()
