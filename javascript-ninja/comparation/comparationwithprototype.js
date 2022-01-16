var obj = {
    'name' : 'leo',
    'age' : 22
    }

var arr = [1,2,3]

var str = 'leonardo'

var num = 1

var type = true

function is( el ) {
    return Object.prototype.toString.call( el )
}

function isObj( el ) {
    return is( el ) === '[object Object]'
}

console.log( is( obj ) )
console.log( is( arr ) )
console.log( is( str ) )
console.log( is( num ) )
console.log( is( type ) )

console.log( isObj( type ) )
console.log( isObj( obj ) )
