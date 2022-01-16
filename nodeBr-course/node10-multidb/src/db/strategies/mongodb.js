const Icrud = require('./interfaces/icrud')

class Mongodb extends Icrud {
    constructor() {
        super()
    }

    create(item) {
        console.log('O item foi salvo em MongoDB')
    }

}

module.exports = Mongodb
