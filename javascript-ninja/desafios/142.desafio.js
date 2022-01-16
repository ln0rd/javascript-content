(function (win, doc) {

    var visor = doc.querySelector('[data-js="visor"]')
    var buttons = doc.querySelectorAll('[data-js="button-number"]')
    var clear = doc.querySelector('[data-id="button-operation-clear"]')

    // buttons.forEach(function (buttom) {
    //     console.log(buttom)
    // })

    // ou poderia ser

    // passa por todos os buttons escutando todos eles
    Array.prototype.forEach.call( buttons, function (button) {

        button.addEventListener('click' , handleClickNumber, false)

    } )

    function handleClickNumber(event) {
        console.log()
        if ( this.value == 0 && this.length < 2 ){
            visor.value = this.value
        }
        visor.value += this.value

    }

    clear.addEventListener( 'click', function (event) {

        visor.value = 0

    },false )

})(window, document)
