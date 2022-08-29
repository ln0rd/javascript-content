import crypto from 'crypto'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'WEBHOOK_SIGNATURE_HELPER' })

export default function generateSignature(payload, secret) {
  Logger.info('Generating signature of WebHook.')

  const Timestamp = Math.floor(Date.now() / 1000)
  const Signature = crypto
    .createHmac('sha256', secret)
    .update(`${Timestamp}.${JSON.stringify(payload)}`, 'utf8')
    .digest('hex')

  return `t=${Timestamp},s=${Signature}`
}
