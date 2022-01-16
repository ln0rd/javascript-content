(function (doc) {

    'use strict'

    var main = doc.querySelector('.main')
    var lua = doc.querySelector('.lua')
    var sol = doc.querySelector('.sol')

    // nome da classe
    main.className
    // todas as classes de main
    main.classList
    // pega o id do elemento
    main.id
    // pega o link
    Element.href
    // pega o title
    Element.title
    // pega o source
    Element.src

    console.log( main.getAttribute('class') )
    console.log( lua.getAttribute('data-type') )
    console.log( sol.getAttribute('data-type') )

    // setando um novo atributo
    sol.setAttribute('data-power', 'fire')
    // pegando o atributo
    console.log(sol.getAttribute('data-power'))

    //pega o proximo irmão
    console.log( lua.nextElementSibling )

    //pega o irmão anterior
    console.log( sol.previousElementSibling )

    // conta todos os filhos elementos
    console.log( main.childElementCount )

    // primeiro elemento filho
    console.log( main.firstElementChild )

})(document)
