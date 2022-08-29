import axios from 'axios'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'CIP_INTEGRATION_CLIENT' })

export function createClient({ baseURL, timeout }) {
  const baseClient = axios.create({
    baseURL,
    timeout
  })

  baseClient.interceptors.request.use(config => {
    const { url, method, data, auth, timeout } = config

    Logger.info(
      { url, method, auth, timeout, data: JSON.stringify(data) },
      'cip-integration-request'
    )

    return config
  })

  baseClient.interceptors.response.use(response => {
    const { data, status, statusText, headers } = response

    Logger.info(
      { data: JSON.stringify(data), status, statusText, headers },
      'cip-integration-response'
    )

    return response
  })

  return {
    authorizeAnticipation: authorizeAnticipation.bind(null, baseClient),
    checkStatus: checkStatus.bind(null, baseClient)
  }
}

async function authorizeAnticipation(
  client,
  {
    walletId,
    merchantId,
    documentNumber,
    cipCorrelationId,
    anticipatedPaymentDate,
    receivableUnits
  }
) {
  const payload = {
    wallet_id: walletId,
    merchant_id: merchantId,
    cip_correlation_id: cipCorrelationId,
    anticipated_payment_date: anticipatedPaymentDate,
    document_number: documentNumber,
    receivable_units: receivableUnits
  }

  Logger.debug(payload, 'sending-request')

  return client.post('/anticipations/authorize', payload, {
    transitional: { clarifyTimeoutError: false }
  })
}

async function checkStatus(client, { cipCorrelationId }) {
  return client.get(`/anticipations/${cipCorrelationId}`, {
    transitional: { clarifyTimeoutError: false }
  })
}
