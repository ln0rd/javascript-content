function add(x) {
    function add2(y) {
        return x + y;
    };

    return add2;

}

console.log( add(2) )
console.log( add(2)() )
console.log( add(2)(4) )



//car example


car = {
    color: 'blue',
    model: 'mitsubish'
}
function getColor(obj){
    return obj.color
}
console.log( getColor(car) )


//receber função por parametro
function showfunc(func) {
    return func();
}

console.log( showfunc( function () {
    return 'programação funcional'
} ) )
