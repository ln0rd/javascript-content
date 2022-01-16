// retorno true ou false todos os item tem que ser true se um for false, ja retorna false

arr = [1,2,3,4,5,6,7,8,9,10,11,12]

result = arr.every( function ( item ) {
    console.log( item )
    return item < 5
} )


console.log( result )
