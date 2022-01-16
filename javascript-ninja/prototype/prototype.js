(function (win, doc) {

    'use strict'

    function Myfunction(name, lastname) {

        this.name = name
        this.lastname = lastname

    }


    Myfunction.prototype.fullname = function () {

        return this.name + ' ' + this.lastname

    }

    var leo = new Myfunction('leo','bufalo');

    console.log( leo.fullname() )

    Myfunction.prototype.age = 22

    console.log( leo.age )


    function fun() {
        Array.prototype.forEach.call( arguments, function (item, index) {
            console.log( item )
        });


        Array.prototype.reduce.call( arguments, function (acumulated, item) {
            console.log( acumulated + item )
        })
    }

    fun( 1, 2, 3, 4, 5, 6, 7)

})()
