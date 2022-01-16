(function () {




    //Busca a classe com nome div1
    console.log( document.getElementsByClassName('div1') )

    //retorna um array de div
    console.log( document.getElementsByTagName('div') )

    //retorna os elementos com name igual
    console.log( document.getElementsByName('name') )

    // ele retorna so o primeiro que ele encontrar
    console.log(  document.querySelector('input'))

    // retorna todos que ele encontrar
    console.log(  document.querySelectorAll('input'))

    // retorna todos type = text
    console.log( 'todos type = text' )
    console.log(  document.querySelectorAll('[type="text"]'))

    // retorna com id
    console.log( 'retorna com id do seletor' )
    console.log(  document.querySelector('#button' ))

    // retorna com classe
    console.log( 'retorna com id do seletor' )
    console.log(  document.querySelector('.name' ))
})()
