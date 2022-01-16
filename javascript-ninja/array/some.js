// ao menos um dos itens for verdadeiro, o retorno e true

arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

var some = arr.some( function ( item ) {
    return item % 2 === 0
} )

console.log ( some )
