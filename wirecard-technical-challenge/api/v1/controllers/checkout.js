const validation = require('../services/service')
const Service = new validation()


class Checkout {

    async boleto(dataPayment) {
        return await Service.doBoletoPayment(dataPayment)
    }

    async creditCard(dataPayment) {
        return await Service.doCardPayment(dataPayment)
    }

    async StatusPayment(id) {
        return await Service.status(id)
    }

    async RegisterBuyer(dataBuyer){
        return await Service.registerBuyer(dataBuyer)
    }

}

module.exports = Checkout
