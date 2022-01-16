(function () {

    'use struct'

    var value1 = 12.87
    var value2 = 12.07
    var value3 = 97
    var value4 = [2,4,67,29,103,02,34.5,102]

    // mostra valor de pi
    console.log( Math.PI )

    //arredonda valor para cima
    console.log( Math.ceil(value1) )

    //arredonda valor para baixo
    console.log( Math.floor(value1) )

    //arredonda pra cima se for acima de .5 para cima
    console.log( Math.round(value1) )
    console.log( Math.round(value2) )

    // rai quadrada
    console.log( Math.sqrt(value3) )

    // raiz cubica
    console.log( Math.cbrt(value3) )

    // retorna o maior valor que eu passar no array
    console.log( Math.max(1,2,3,4,5,6,80,45) )
    console.log( Math.max.apply(Math, value4) )

    // retorna o menor valor que eu passar no array
    console.log(Math.min(1, 2, 3, 4, 5, 6, 80, 45))
    console.log(Math.min.apply(Math, value4))

    // pega valores randomizados naturalmente de 0 a 1, se quiser acima disso multiplique pelo valor.
    console.log( Math.random() )
    console.log( Math.random() * 102 )

    //n quero que apareça o quebrado entao eu arredondo
    console.log( Math.round(Math.random() * 102) )


})()
