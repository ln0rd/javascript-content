(function (win, doc) {
    log = console.log

    var a = doc.querySelector('[data-js="link2"]')


    //ONCLICK PODE SER SUBSCRITO

    a.onclick = function (event) {
        event.preventDefault()
        alert('clicou no segundo link')
    }

    a.onclick = function (event) {
        event.preventDefault()
        alert('clicou no segundo link E ATIVOU o segundo onclick')
    }

})(window, document)
