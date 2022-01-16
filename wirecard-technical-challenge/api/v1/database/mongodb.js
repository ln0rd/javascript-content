const Mongoose = require('mongoose')


class MongoDB {

    constructor(){

        this._Paymentschema = null
        this._Buyersschema = null

        this._modelPayment = null
        this._modelBuyers = null

    }


    connectDatabase(){

        try {
            Mongoose.connect('mongodb://myuser:mypassword@localhost:27017/wirecard', { useNewUrlParser: true }, function (error) {
                if (!error) {
                    return true
                }
                throw('ocorreu um erro em conectar ao banco')
            })
        } catch (error) {
            return false
        }
        return true

    }

    verifyConnection(){

        const states = {
            0: 'desconectado',
            1: 'conectado',
            2: 'conectando',
            3: 'desconectado'
        }

        const state = states[Mongoose.connection.readyState]

        if (state === 'conectado') {
            return true
        }

        if (state === 'conectando'){
            setTimeout( function () {}, 2000)
        }

        if (state === 'desconectando') {
            return false
        }

        if (state === 'desconectado') {
            return false
        }

        return true

    }



    async definePaymentSchema(){

        if (this._Paymentschema !== null) {
            return true
        }

        this._Paymentschema = new Mongoose.Schema({
            id_client: {
                type: Number,
                required: true
            },
            name_buyer: {
                type: String,
                required: true
            },
            email_buyer: {
                type: String,
                required: true
            },
            cpf_buyer: {
                type: String,
                required: true
            },
            amount_payment: {
                type: Number,
                required: true
            },
            type_payment: {
                type: String,
                required: true
            },
            card_information: {
                card_name: {
                    type: String,
                    default: null
                },
                card_expiration: {
                    type: Number,
                    default: null
                },
                card_number: {
                    type: String,
                    default: null
                },
                card_issuer: {
                    type: String,
                    default: null
                },
                card_cvv: {
                    type: Number,
                    default: null
                }
            },
            boleto_information: {
                boleto_codebar: {
                    type: String,
                    default: null
                }
            },
            payment_status: {
                type: Number,
                require: true,
                default: 0
            }
        })
        this._modelPayment = Mongoose.model('payment', this._Paymentschema)
        if (!this._modelPayment) {
            return false
        }
        return true
    }



    async defineBuyerSchema(){

        if (this._Buyersschema !== null) {
            return true
        }

        this._Buyersschema = new Mongoose.Schema({
            name_buyer: {
                type: String,
                required: true
            },
            email_buyer: {
                type: String,
                required: true
            },
            cpf_buyer: {
                type: Number,
                required: true
            }
        })
        this._modelBuyers = Mongoose.model('buyer', this._Buyersschema)
        if (!this._modelBuyers) {
            return false
        }
        return true
    }



    async insertPayment(dataPayment){
        this.connectDatabase()
        let isConnected = this.verifyConnection()
        if (!isConnected){
            return { IsOk: false, problem: 'Ocorreu um problema em conectar ao banco', type: 'database' }
        }
        if(!this.definePaymentSchema()){
            return { IsOk: false , problem: 'Ocorreu um problema em definir o Schema', type: 'schema'}
        }
        try {
            let responseInsert = await this._modelPayment.create(dataPayment)
            return { IsOk: true, responseInsert }
        } catch (error) {
            return { IsOk: false, problem: 'Ocorreu um problema em Inserir no banco', type: 'model' }
        }
    }



    async getPaymentStatus(cpf){
        this.connectDatabase()
        let isConnected = this.verifyConnection()
        if (!isConnected) {
            return { IsOk: false, problem: 'Ocorreu um problema em conectar ao banco', type: 'database' }
        }
        if (!this.definePaymentSchema()) {
            return { IsOk: false, problem: 'Ocorreu um problema em definir o Schema', type: 'schema' }
        }
        try {
            var databaseResponse = await this._modelPayment.find({cpf_buyer: cpf})
            if (databaseResponse.length === 0) {
                return { IsOk: false, problem: 'Não há pagamentos com esse cpf', type: 'empty' }
            }
            return { IsOk: true, databaseResponse }
        } catch (error) {
            return { IsOk: false, problem: 'Ocorreu um problema em Consultar no banco', type: 'model' }
        }
    }



    async insertBuyer(dataBuyer){
        this.connectDatabase()
        let isConnected = this.verifyConnection()
        if (!isConnected) {
            return { IsOk: false, problem: 'Ocorreu um problema em conectar ao banco', type: 'database' }
        }
        if (!this.defineBuyerSchema()) {
            return { IsOk: false, problem: 'Ocorreu um problema em definir o Schema', type: 'schema' }
        }
        try {
            let databaseResponse = await this._modelBuyers.create(dataBuyer)
            return { IsOk: true, databaseResponse }
        } catch (error) {
            return { IsOk: false, problem: 'Ocorreu um problema em cadastrar no banco', type: 'model' }
        }
    }



    async getBuyer(cpf){
        this.connectDatabase()
        let isConnected = this.verifyConnection()
        if (!isConnected) {
            return { IsOk: false, problem: 'Ocorreu um problema em conectar ao banco', type: 'database'}
        }
        if (!this.defineBuyerSchema()) {
            return { IsOk: false, problem: 'Ocorreu um problema em definir o Schema', type: 'schema' }
        }
        try {
            let databaseResponse = await this._modelBuyers.find({cpf_buyer: cpf})
            if (databaseResponse.length === 0) {
                return { IsOk: false }
            }
            return { IsOk: true, databaseResponse }
        } catch (error) {
            return { IsOk: false, problem: 'Ocorreu um problema em Consultar no banco', type: 'model' }
        }
    }

}



module.exports = MongoDB
