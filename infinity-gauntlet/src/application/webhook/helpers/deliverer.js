import R from 'ramda'
import Promise from 'bluebird'
import Company from 'application/core/models/company'
import WebHookEvent from 'application/webhook/models/event'
import createLogger from 'framework/core/adapters/logger'
import { publishWebHook } from 'application/webhook/helpers/queue'

const Logger = createLogger({ name: 'WEBHOOK_DELIVERER_HELPER' })

/** Tries to send an existing event to the webhook queue
 *
 * @param event
 * @returns Promise<WebHookEvent>
 */
export function resendWebHook(event) {
  return sendWebHook(
    event.company_id,
    event.name,
    event.model,
    event.model_id,
    event.old_status,
    event.current_status,
    JSON.parse(event.payload),
    event
  )
}

/** Sends the webhook event to the webhook queue. If the event parameter exists
 * it will try to send the existing event instead of creating a new one
 *
 * @param companyId
 * @param eventName
 * @param model
 * @param modelId
 * @param oldStatus
 * @param currentStatus
 * @param payload
 * @param event
 * @returns Promise<WebHookEvent>
 */
export default function sendWebHook(
  companyId,
  eventName,
  model,
  modelId,
  oldStatus,
  currentStatus,
  payload,
  event
) {
  Logger.debug(
    {
      context: {
        companyId,
        eventName,
        model,
        modelId,
        oldStatus,
        currentStatus,
        payload,
        event
      }
    },
    'send-webhook-debug'
  )
  if (event) {
    return Promise.resolve()
      .then(getCompany)
      .then(company => sendToQueue({ company, event }))
  }

  return Promise.resolve()
    .then(getCompany)
    .tap(checkCompany)
    .then(saveEvent)
    .then(sendToQueue)
    .catch(onError)

  function onError(err) {
    Logger.error(err, 'deliverer-webhook-error')
  }

  function getCompany() {
    return Company.findOne({ _id: companyId })
      .select({ _id: 1, webhook_configs: 1 })
      .lean()
  }

  function checkCompany(company) {
    if (!company) {
      throw new Error('Company not found.')
    }

    if (!company.webhook_configs.enabled) {
      throw new Error(
        `WebHook of event '${eventName}' from company ${
          company._id
        } not sent. WebHooks are disabled for this company.`
      )
    }

    if (!R.contains(eventName, company.webhook_configs.events)) {
      throw new Error(
        `WebHook of event '${eventName}' from company ${
          company._id
        } not sent to '${
          company.webhook_configs.url
        }' because the event '${eventName}' is disabled.`
      )
    }

    return company
  }

  async function saveEvent(company) {
    const eventPayload = {
      name: eventName,
      model: model,
      model_id: modelId,
      company_id: company._id,
      old_status: oldStatus,
      current_status: currentStatus,
      payload: JSON.stringify(payload)
    }

    const event = await WebHookEvent.create(eventPayload)

    return Promise.resolve({
      event: Object.assign(eventPayload, { _id: event._id.toString() }),
      company
    })
  }

  function sendToQueue({ company, event }) {
    return publishWebHook(
      Buffer.from(
        JSON.stringify({
          webhookSecret: company.webhook_configs.secret,
          event: event.toJSON ? event.toJSON() : event,
          url: company.webhook_configs.url,
          payload: payload
        })
      )
    ).then(() => event)
  }
}
