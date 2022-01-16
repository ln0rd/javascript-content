(function (doc) {
    log = console.log

    'use strict'

    var main = doc.querySelector('.main')
    var lua = doc.querySelector('.lua')
    var sol = doc.querySelector('.sol')

    // verifica se tem oa atributo
    console.log( main.hasAttribute('data-type') )

    // verifica se tem algum atributo
    console.log( main.hasAttributes() )

    // adiciona um filho ao elemento
    console.log( main.appendChild(lua) )

    // insere antes de algum elemento
    main.insertBefore( sol, lua )

    // clona o elemento
    log(main.cloneNode(lua, true))

    //pergunta se tem algum filho (comentarios, quebra de linhs, etc)
    console.log(sol.hasChildNodes())

    //criar um elemento
    el = doc.createElement('div')
    console.log( el )

})(document)
