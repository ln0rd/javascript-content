var numeros = []

numeros = [1,2,3,4,5]

console.log(numeros)

console.log(numeros[0])


var arr = ['leo', null, true, 11, { bola:'azul'}, function name() {return 'oi'} ]

console.log( arr[5]() )
console.log( arr[4] )
console.log( arr[4].bola )

console.log( arr.length )


arr.push([1,2,3])

console.log( arr )

console.log( arr[6] )
console.log( arr[6][2] )

// copiar um array usando map
var array2 = numeros.map(function (item) {
    return item
})

var array3 = Array.prototype.map.call( numeros , function (item) {
    return item
} )

var array4 = numeros.slice(0)

console.log( array2 )
console.log( array3 )
console.log( array4 )
