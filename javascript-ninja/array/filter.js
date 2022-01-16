//filtra e so retorna os resultados true

arr = [1,2,3,4,5,6,7,8,9,10,11,12]

var filter = arr.filter( function ( item, index, array) {
    return item > 2
} )

console.log ( filter )
