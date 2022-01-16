const Icrud = require('./interfaces/icrud')
const Mongoose = require('mongoose')
const STATUS = {
    0: 'Desconectado',
    1: 'Conectado',
    2: 'Conectando',
    3: 'Desconectado'
}

this._drive = null


class Mongodb extends Icrud {
    constructor() {
        super()
        this._herois = null
        this._drive = null
    }

    async isConnected() {
        const state = STATUS[this._drive.readyState]

        if (state === 'Conectado') {
            return true
        }

        if (state === 'Conectando') {
            await new Promise( resolve => setTimeout(resolve, 1000))
            return STATUS[this._drive.readyState]
        }

    }

    defineModel() {
        heroiSchema = new Mongoose.Schema({
            nome: {
                type: String,
                required: true,
            },
            poder: {
                type: String,
                required: true
            }
        })

        this._herois = Mongoose.model('herois', heroiSchema)

    }

    Connect() {
        Mongoose.connect('mongodb://leo:minhasenhasecreta@localhost:27017/herois',
            { useNewUrlParser: true },
            function (error) {
                if (!error) {
                    return
                }
                console.log('Falha na Conexão: ', error)
            })

        const connection = Mongoose.connection
        this._drive = connection

        connection.once('open', function () {
            console.log('database rodando')
        })


    }

    async create(item) {
        const resultCadastrar = await model.create({ nome: 'Fumikage Tokoyami', poder: 'Dark Shadown' })

        console.log('ResultCadastrar: ', resultCadastrar)
    }

}

module.exports = Mongodb
