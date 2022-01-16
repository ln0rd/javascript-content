// ele cria um novo array e n modifica o original

var arr = [1,2,3,4,5,6,7,8,9,10,11,12]

var map = arr.map( function ( item, index, array ) {
    return item + 1;
} )

console.log( map )
console.log( arr )
