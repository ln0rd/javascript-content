//slice
arr = [1,2,3,4,5,6,7,8,9,10]

console.log( arr.slice( 0,2 ) )
console.log( arr.slice( 2,4 ) )
console.log( arr.slice( 5,10 ) )
console.log( arr.slice( 8 ) )

arr = arr.slice( 8 )

console.log(arr)



//splice mexe no arr principal
arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

console.log( arr.splice( 5 ) )

console.log( arr )

console.log( arr.splice( 3, 0, 'a', 'b', 'c', true, false ) )
console.log( arr )

arr.splice( 1, 4, 2 ,3  )
console.log( arr )
