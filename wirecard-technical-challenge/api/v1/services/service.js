const Database = require('../database/mongodb')
const creditCardValidation = require('credit-card-validation')
const ErrorHandling = require('../utils/error')
const Mocks = require('../utils/mocks')
const mocks = new Mocks()
const database = new Database()



class Service {

    async status(id, test = false){


        /*
        Status Code
        0 Aguardando
        1 Aprovado
        2 Negado
        */

        if (test) {
            return { Payment_Information: mocks.MockStatus()}
        }

        let responseFind = await database.getPaymentStatus(id)
        if (!responseFind.IsOk) {
            return new ErrorHandling(responseFind.type, responseFind.problem )
        }

        return { Payment_Information: responseFind.databaseResponse}

    }


    async doBoletoPayment(dataPayment, test = false){

        if (test) {
            return mocks.MockdoBoletoPayment()
        }

        let buyerInfo = await this.identifyBuyer(dataPayment.cpf_buyer)

        if (!buyerInfo) {
            return new ErrorHandling('Validate', 'Ocorreu um erro, você não está cadastrado, por favor se cadastre para prosseguir')
        }

        dataPayment = {
            ...dataPayment,
            name_buyer: buyerInfo.name,
            email_buyer: buyerInfo.email
        }
        if(!this.validateEmptyData(dataPayment)){
            return new ErrorHandling('Validate', 'Ocorreu um erro, existem informações vazias')
        }

        dataPayment = {
            ...dataPayment,
            boleto_information: {
                boleto_codebar: this.generatorBoletoCodebar()
            }
        }

        if(!this.validateEmptyData(dataPayment.boleto_information)){
            return new ErrorHandling('Validate','Ocorreu um erro, existem informações vazias sobre o boleto')
        }
        let response = await database.insertPayment(dataPayment)

        if(response.IsOk === false){
            return new ErrorHandling( response.type, response.problem )
        }

        return { IsOk: true, codebar: response.responseInsert.boleto_information.boleto_codebar}

    }



    async doCardPayment(dataPayment, test = false){

        if (test) {
            return mocks.MockdoCardPayment()
        }

        let buyerInfo = await this.identifyBuyer(dataPayment.cpf_buyer)

        if (!buyerInfo) {
            return new ErrorHandling('Validate', 'Ocorreu um erro, você não está cadastrado, por favor se cadastre para prosseguir')
        }

        dataPayment = {
            ...dataPayment,
            name_buyer: buyerInfo.name,
            email_buyer: buyerInfo.email
        }

        if (!this.validateEmptyData(dataPayment)) {
            return new ErrorHandling('Validate', 'Ocorreu um erro, existem informações vazias')
        }

        if (!this.validateCard(dataPayment.card_information.card_number)) {
            return new ErrorHandling('Validate', 'Ocorreu um erro, seu cartão parece não ser válido')
        }

        dataPayment.card_information = {
            ...dataPayment.card_information,
                card_issuer: this.identifyIssuerCard(dataPayment.card_information.card_number)
            }

        if (!this.validateEmptyData(dataPayment.card_information)) {
            return new ErrorHandling('Validate', 'Ocorreu um erro, existem informações vazias sobre seu cartão')
        }

        let response = await database.insertPayment(dataPayment)
        if (!response.IsOk) {
            return new ErrorHandling(response.type, response.problem)
        }
        return { IsOk: true, message: 'Seu pagamento foi registrado com sucesso, e já está disponivel para consulta' }
    }



    validateCard(cardNumber){

        /*
            Possible cards validate with npm package:
            American Express
            Diner's Club
            Discover
            JCB
            Maestro
            MasterCard
            UnionPay
            Visa
        */

        let card = creditCardValidation(cardNumber)
        if (!card.isValid()) {
            return false
        }
        return true

    }



    identifyIssuerCard(cardNumber){

        let card = creditCardValidation(cardNumber)
        return card.getType()

    }



    async identifyBuyer(cpf, test = false){

        if (test) {
            return mocks.MockidentifyBuyer()
        }

        let response = await database.getBuyer(cpf)
        if (!response.IsOk) {
            return false
        }
        return { name: response.databaseResponse[0].name_buyer, email: response.databaseResponse[0].email_buyer }
    }



    async registerBuyer(dataBuyer, test = false){

        if (test) {
            return mocks.MockregisterBuyer()
        }

        if (!this.validateEmptyData(dataBuyer)) {
            return new ErrorHandling( 'Validate', 'Ocorreu um problema, existem campos vazios para cadastrar o comprador' )
        }

        let response = await database.insertBuyer(dataBuyer)

        if (!response.IsOk) {
            return new ErrorHandling( response.type, response.problem )
        }

        return { IsOk: true, message: 'Comprador cadastro com sucesso' }

    }



    validateEmptyData(dataPayment){
        for (const key in dataPayment) {
            if (dataPayment[key] === '') {
                return false
            }
        }
        return true
    }



    generatorBoletoCodebar(){
        let avaibleBoletos = {
            0: '001910000700302122304055711936102401070078012682',
            1: '001900000500302122304033321936104401070043243102',
            2: '789900000300302122304074541936104401070034243123',
            3: '111900000200302122304086661936104401070010243226',
            4: '121900000900302122304098171936104401070045243787',
            5: '021450000000302122304009281936104401070009243658',
            6: '941980000600302122304011941936104401070089243900',
            7: '081910003400302122304030051936104401070056243450',
            8: '051920006000302122304044671936104401070023243764',
            9: '341917900101043510047910201500085776895833333330'
        }

        let randomNumber = Math.floor(Math.random() * 10)

        return avaibleBoletos[randomNumber]

    }
}



module.exports = Service
