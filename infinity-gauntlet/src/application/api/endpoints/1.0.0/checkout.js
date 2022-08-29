import CheckoutService from 'application/core/services/checkout'

export default class CheckoutEndpoint {
  static createPaymentLink(req, res) {
    const { company_id, items } = req.body

    return CheckoutService.createPaymentLink(company_id, items).then(response =>
      res.json(200, response)
    )
  }
}
