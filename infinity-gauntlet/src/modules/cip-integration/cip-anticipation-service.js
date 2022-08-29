import { createClient } from 'modules/cip-integration/client'
import config from 'application/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'CIP_ANTICIPATION_SERVICE' })
export class CipAnticipationService {
  constructor({ logContext }) {
    const { url, timeout } = config.anticipation.spot.cipIntegration
    const client = createClient({ baseURL: url, timeout })

    this.client = client
    this.log = Logger.child(logContext)
  }

  async authorize({
    walletId,
    merchantId,
    cipCorrelationId,
    anticipatedPaymentDate,
    receivableUnits,
    documentNumber
  }) {
    let response
    try {
      response = await this.client.authorizeAnticipation({
        walletId,
        merchantId,
        cipCorrelationId,
        anticipatedPaymentDate,
        receivableUnits,
        documentNumber
      })
    } catch (err) {
      this.log.error({ err }, 'failed-contacting-cip-integration')

      return [null, err]
    }

    return [response.data, null]
  }

  async checkStatus({ cipCorrelationId }) {
    let response

    try {
      response = await this.client.checkStatus({ cipCorrelationId })

      this.log.info({ data: response.data }, 'anticipation-status-response')
    } catch (err) {
      this.log.error(
        { err, cipCorrelationId },
        'failed-checking-anticipation-status'
      )

      return [null, err]
    }

    if ('status' in response.data) {
      return [response.data.status, null]
    }

    return [
      null,
      new Error(
        `CIP Integration returned no status for anticipation request ${cipCorrelationId}`
      )
    ]
  }
}
