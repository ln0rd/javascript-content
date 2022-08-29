import axios from 'axios'
import createLogger from 'framework/core/adapters/logger'
import IntegrationGenericError from 'application/core/errors/integration-generic-error'

const IDWALL_URI = process.env.IDWALL_URI || 'https://api-v2.idwall.co'
const IDWALL_API_KEY = process.env.IDWALL_API_KEY

const IDWALL_WAIT_MAX_RETRIES =
  parseInt(process.env.IDWALL_WAIT_MAX_RETRIES) || 3
const IDWALL_WAIT_DELAY_RETRIES =
  parseInt(process.env.IDWALL_WAIT_DELAY_RETRIES) || 5000

const Logger = createLogger({ name: 'IDWALL_HELPER' })

export async function createIdwallReport(locale, body) {
  const endpoint = `${IDWALL_URI}/relatorios`
  const headers = {
    'Content-Type': 'application/json',
    Authorization: IDWALL_API_KEY
  }

  const delay = intervalMs =>
    new Promise(resolve => setTimeout(resolve, intervalMs))

  const context = {
    baseURL: IDWALL_URI,
    url: endpoint,
    method: 'POST',
    headers: null, // sensitive data (API Key)
    params: null,
    data: body
  }
  Logger.debug(context, 'idwall-create-validation-report')

  /* eslint-disable no-await-in-loop */
  for (let retries = 0; retries <= IDWALL_WAIT_MAX_RETRIES; retries++) {
    try {
      const response = await axios.post(endpoint, body, { headers })
      Logger.info(
        { response: response.data },
        'idwall-create-validation-report-ok'
      )
      return response
    } catch (err) {
      if (retries === IDWALL_WAIT_MAX_RETRIES) {
        Logger.error(
          { err, context, response: err.response.data },
          'idwall-create-validation-report-failed'
        )
        err.config = context
        throw new IntegrationGenericError(locale, err, 'idwall')
      }
    }
    await delay(IDWALL_WAIT_DELAY_RETRIES)
  }
  /* eslint-enable no-await-in-loop */
}
