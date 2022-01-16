(function () {

    'use strict'

    var item = document.querySelector('.middle')

    var content = '<div class="top" style="width:100%; height: 80px; background-color: coral; color: white;">top</div>'

    item.insertAdjacentHTML( 'beforeBegin', content )

    // outerHTML é a string em html do elemento selecionado
    // diferente do innerhtml que é o texto corrido do elemento
    // nao da pra inserir o elemento direto pois ele vai inserir o tipo em vez do conteudo
    item.insertAdjacentHTML('afterend', item.outerHTML)

})()
