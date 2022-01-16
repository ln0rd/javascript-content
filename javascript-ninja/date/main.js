(function () {
    'use strict'

    var year = 2018;
    var month = 12;
    var day = 24;
    var hour = 13;
    var min = 20;
    var sec = 25;
    var milloseconds = 3;

    var date = new Date(year, month, day, hour, min, sec, milloseconds);
    console.log(date);

    // retorna em segundos
    var now = Date.now()
    console.log( now )
    console.log( now /= 1000 )
    console.log( now /= 60 )
    console.log( now /= 24 )

    // retornando dia atual

    var current = new Date

    // dia
    console.log( current.getDate() )
    // dia da semana de 0 a 6 de segunda a sexta 0 domingo e 6 sabado
    console.log( current.getDay() )
    // ano
    console.log( current.getFullYear() )
    // de 1900 ate o ano atual, exemplo: 1900 - 2018 = 118
    console.log( current.getYear() )
    // a hora atual
    console.log( current.getHours() )
    // os minutos
    console.log( current.getMinutes() )
    // os segundos
    console.log( current.getSeconds() )


})()
