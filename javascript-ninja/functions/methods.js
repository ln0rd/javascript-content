(function () {

    'use strict'

    function myFunc(a,b,c) {

    }

    //quando usa toString na função ela é mostrada literalmente
    console.log( myFunc.toString() )

    //imprime a quantia de parametros ele aceita
    console.log( myFunc.length )


    //quando se tem um array e usa o toString todo o array é convertido para string
    var arr = [1,2,3]
    console.log( arr.toString() )


    var obj = {
        prop1: '1',
        prop2: 2,
        prop3: {
            prop3: '2'
        }
    }

    console.log( obj.toString() )

})()
