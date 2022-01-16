// diretiva não deixa criar variavel sem var ou let
'use strict';


(function name() {

    var name = 'leo'
    name2 = 'leo'
    console.log( name )

})()

name2 = 2;
console.log( name2 )
