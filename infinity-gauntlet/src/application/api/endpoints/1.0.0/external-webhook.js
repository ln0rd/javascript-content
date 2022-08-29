import ExternalWebhookService from 'application/core/services/external-webhook'

export default class ExternalWebhookEndpoint {
  static async handle(req, res) {
    const response = await ExternalWebhookService.handle(req)

    return res.json(200, response)
  }
}
