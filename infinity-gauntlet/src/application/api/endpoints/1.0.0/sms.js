import SmsService from 'application/core/services/sms'

export default class SmsEndpoint {
  static forgotPassword(req, res) {
    const body = req.body
    const locale = body.locale
    const phoneNumber = body.phone_number

    return SmsService.sendPasswordRecovery(locale, phoneNumber).then(response =>
      res.json(200, response)
    )
  }

  static validateCode(req, res) {
    const body = req.body
    const locale = body.locale
    const phoneNumber = body.phone_number
    const code = body.code

    return SmsService.validateCode(locale, phoneNumber, code).then(response =>
      res.json(200, response)
    )
  }
}
