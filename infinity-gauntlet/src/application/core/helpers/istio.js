import axios from 'axios'
import createLogger from 'framework/core/adapters/logger'

const ISTIO_WAIT_SIDECAR = process.env.ISTIO_WAIT_SIDECAR === 'true'
const ISTIO_QUIT_SIDECAR = process.env.ISTIO_QUIT_SIDECAR === 'true'

const ISTIO_INFO_URL =
  process.env.ISTIO_INFO_URL || 'http://localhost:15000/server_info'
const ISTIO_QUIT_URL =
  process.env.ISTIO_QUIT_URL || 'http://localhost:15020/quitquitquit'

const ISTIO_WAIT_MAX_RETRIES = parseInt(process.env.ISTIO_WAIT_MAX_RETRIES) || 6
const ISTIO_WAIT_DELAY_RETRIES =
  parseInt(process.env.ISTIO_WAIT_DELAY_RETRIES) || 10000

const Logger = createLogger({ name: 'ISTIO_HELPER' })

export const quitIstio = async () => {
  if (!ISTIO_QUIT_SIDECAR) return

  const context = {
    istioQuitUrl: ISTIO_QUIT_URL
  }

  Logger.info(context, 'quit-istio')

  try {
    await axios.post(ISTIO_QUIT_URL, null, {
      validateStatus: status => status === 200
    })

    Logger.info({}, 'quit-istio-ok')
  } catch (err) {
    err.context = context
    Logger.error({ err }, 'quit-istio-failed')
  }
}

export const waitForIstio = async () => {
  if (!ISTIO_WAIT_SIDECAR) return

  const context = {
    istioInfoUrl: ISTIO_INFO_URL,
    istioWaitMaxRetries: ISTIO_WAIT_MAX_RETRIES,
    istioWaitDelayRetries: ISTIO_WAIT_DELAY_RETRIES
  }

  Logger.info(context, 'wait-istio')

  const delay = intervalMs =>
    new Promise(resolve => setTimeout(resolve, intervalMs))

  /* eslint-disable no-await-in-loop */
  for (let retries = 0; retries <= ISTIO_WAIT_MAX_RETRIES; retries++) {
    try {
      await axios.get(ISTIO_INFO_URL, {
        validateStatus: status => status === 200
      })

      await delay(ISTIO_WAIT_DELAY_RETRIES)
      Logger.info({}, 'wait-istio-ok')

      break
    } catch (err) {
      if (retries === ISTIO_WAIT_MAX_RETRIES) {
        err.context = context
        Logger.error({ err }, 'wait-istio-failed')

        throw err
      }

      await delay(ISTIO_WAIT_DELAY_RETRIES)
    }
  }
  /* eslint-enable no-await-in-loop */
}
