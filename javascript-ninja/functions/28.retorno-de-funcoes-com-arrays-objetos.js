function a() {
    return [1,2,3]
}


console.log( a() )
console.log( a()[0] )
console.log( a()[1] )
console.log( a()[2] )

function fun2(){

    return {
        prop1: 1,
        prop2: 'leo',
        prop3: function() {
            return 'prop3'
        }
    }

}

console.log( fun2() )
console.log( fun2().prop1 )
console.log( fun2().prop2 )
console.log( fun2().prop3 )
console.log( fun2().prop3() )



arr = [1, 2, 3]

function rtn(arg) {
    return arg
}

function rtn2(arg) {
    return arg[2]
}

console.log( rtn(arr) )
console.log( rtn2(arr) )

obj = {
    prop1: 'leo',
    prop2: 22,
    prop3: true
}

console.log( rtn(obj) )
console.log( rtn(obj).prop1 )
console.log( rtn(obj).prop2 )
