/* eslint-disable no-await-in-loop */
import Transaction from 'application/core/models/transaction'
import createLogger from 'framework/core/adapters/logger'
import WebHookEvent from 'application/webhook/models/event'
import sendWebHook from 'application/webhook/helpers/deliverer'

const Logger = createLogger({
  name: 'MANUAL_FIX_NEON_WEBHOOKS'
})

async function send(webhook) {
  let transaction
  try {
    transaction = await Transaction.findOne({ _id: webhook.model_id })
      .lean()
      .exec()
  } catch (err) {
    Logger.error({ err }, 'query-transaction-failed')
    throw err
  }

  // We will send webhooks only for transactions that have been removed from the base
  if (transaction) {
    return false
  }

  const newWebhook = JSON.parse(JSON.stringify(webhook))
  newWebhook.name = 'transaction_refused'
  newWebhook.old_status = 'paid'
  newWebhook.current_status = 'refused'
  newWebhook.payload = newWebhook.payload.replace(
    '"status":"paid"',
    '"status":"refused"'
  )
  await sendWebHook(
    newWebhook.company_id,
    newWebhook.name,
    newWebhook.model,
    newWebhook.model_id,
    newWebhook.old_status,
    newWebhook.current_status,
    JSON.parse(newWebhook.payload)
  )
  Logger.info({ webhook: newWebhook }, 'webhook-created')
  return true
}

export default class ManualFixNeonWebhooks {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'start-process')

    // Execute only if has webhook_id in args
    if (args[0] !== '') {
      for (const arg of args) {
        let webhook
        try {
          webhook = await WebHookEvent.findOne({ _id: arg })
            .lean()
            .exec()
        } catch (err) {
          Logger.error({ err }, 'query-webhook-failed')
          throw err
        }

        if (!webhook) {
          continue
        }

        await send(webhook)
      }

      return
    }

    let webhooks
    try {
      webhooks = await WebHookEvent.find({
        name: 'transaction_created',
        model: 'transaction',
        company_id: '6022e1709af07f00063e12fc',
        current_status: 'paid',
        created_at: {
          $gt: new Date('2021-11-23T10:00:00.000-03:00'),
          $lt: new Date('2021-11-23T19:00:00.000-03:00')
        }
      })
        .lean()
        .exec()
    } catch (err) {
      Logger.error({ err }, 'query-webhooks-failed')
      throw err
    }

    let sentCount = 0
    const sentErrors = []

    for (const webhook of webhooks) {
      try {
        const result = await send(webhook)
        if (result) {
          sentCount++
        }
      } catch (err) {
        Logger.error({ err }, 'webhook-sent-failed')
        sentErrors.push({ webhook_id: webhook._id, err: err })
      }
    }

    Logger.info({ sentCount }, 'webhooks-sent')
    Logger.info({ sentErrors }, 'sent-errors')
  }
}
