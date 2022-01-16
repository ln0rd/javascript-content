(function () {


    function sumAll() {
        return Array.prototype.reduce.call(arguments, function (acumulated, item) {
            return acumulated + item;
        })
    }

    console.log( sumAll( 1, 2, 3) )

})()
