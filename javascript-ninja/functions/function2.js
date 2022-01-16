function nomes(){

    return ['leo', 'leo', 3]

}

console.log ( nomes() )

console.log( nomes()[1] )




//função retornando um objeto

function object(){

    return {
        'prop1': 1,
        'prop2': 'leo',
        'prop3': function() { return 'prop3' }
    }

}
console.log( object() )
console.log ( object().prop1 )
console.log( object().prop3() )

let value = object().prop3

console.log ( value() )
