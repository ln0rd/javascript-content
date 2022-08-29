import config from 'application/core/config'
import checkout from '@hashlab/checkout-client'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'IG_CHECKOUT_SERVICE'
})

export default class CheckoutService {
  static getClient() {
    return checkout.createCheckoutClient(config.services.checkout_endpoint)
  }

  static createPaymentLink(companyId, items) {
    return CheckoutService.getClient()
      .createPaymentLink(
        companyId,
        items.map(item =>
          Object.assign(item, {
            name: item.description || 'Leozinha A920',
            price: item.price
          })
        )
      )
      .catch(err => {
        Logger.error({ err }, 'create-payment-link-err')
        throw err
      })
  }

  static updateOrderPayment(transactionId, payload) {
    return CheckoutService.getClient()
      .updateOrderPayment(transactionId, payload)
      .catch(err => {
        Logger.error({ err }, 'update-order-payment-err')
        throw err
      })
  }
}
