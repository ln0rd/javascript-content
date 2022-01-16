(function () {

    'use strict'

    var div = document.querySelector('div')
    var counter = 0;



    setInterval(() => {

        var colors = {
            color1: '66FFB2',
            color2: 'B266FF',
            color3: 'FF007F',
            color4: 'FF0000'
        }

        counter++

        if( counter > 4)
        counter = 1;

        div.style = "height: 100px; background-color: #" + colors['color'+counter] +';'
        div.style.width = '100px'
    }, 2000);


})()
