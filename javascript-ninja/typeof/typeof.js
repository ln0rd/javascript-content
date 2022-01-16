
var a = 'leo';
var b = 1;
var c = true
let d = null
let e = NaN
let f = undefined
let g = {}
let h = []

console.log( typeof a )
console.log( typeof b )
console.log( typeof c )
console.log( typeof d )
console.log( typeof e )
console.log( typeof f )
console.log( typeof g )
console.log( typeof h )


function sum(a,b) {
    return a + b
}

console.log( sum( [], [] ) )
console.log( sum( [], {} ) )
console.log( sum( function (){}, [] ) )
console.log( sum( {}, function () { } ) )
console.log( sum( +2, -1 ) )
console.log( sum( undefined, null ) )
