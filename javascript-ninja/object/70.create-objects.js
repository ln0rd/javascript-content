//-mutaveis


var obj = {

    prop1: 'prop1',
    prop2: 'prop2'

}

console.log( obj )

var obj2 = Object.prototype

console.log( obj2 )
console.log( typeof(obj2) )

var arr = Array.prototype

console.log( arr )
console.log( typeof (arr) )

//-Herdar valores, mas não é uma referencia, apenas herdou
var obj3 = { x: 1, y: 2}

var obj4 = Object.create(obj3)

console.log( obj4 )
console.log( obj4.x )
console.log( obj4.y )

//verificar se foi herdado
console.log(obj4.hasOwnProperty('x'))
console.log(obj4.hasOwnProperty('y'))

var obj5 = { z: 5}
console.log(obj5.hasOwnProperty('z'))
