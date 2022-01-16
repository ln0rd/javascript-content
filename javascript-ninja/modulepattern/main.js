(function () {
    'use strict'

    var counter = 0;

    // 2- desse esse counter que contaria de  a 6 ira contar
    // de 150 a 156.
    // function increment() {
    //     return counter++;
    // }

    // 3- nesse caso criando uma função alto executavel
    // nos criamos um escopo dentro da função
    // e voltamos um novo contador diferente do escopo
    // global, então otherFunction não irá afeta-lo.
    var increment = (function () {
        var counter = 0;
        return function() {
            return counter++
        }
    })()

    function otherFunction(params) {
        counter = 150;
    }

    // 1- nesse caso ele ira imprimir 150 pra cima pq a funcão
    // otherfunction alterou o valor de counter do escopo
    // global
    otherFunction()

    console.log(increment())
    console.log(increment())
    console.log(increment())
    console.log(increment())
    console.log(increment())
    console.log(increment())
    console.log(increment())


})()
