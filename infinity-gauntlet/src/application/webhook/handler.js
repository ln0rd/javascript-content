import request from 'axios'
import createLogger from 'framework/core/adapters/logger'
import WebHookEvent from 'application/webhook/models/event'
import WebHookDelivery from 'application/webhook/models/delivery'
import generateSignature from 'application/webhook/helpers/signature'
import { webHookEventResponder } from 'application/core/responders/webhook'
import cuid from 'cuid'
import mongoose from 'mongoose'
import Joi from 'joi'
import assert from 'assert'
import R from 'ramda'

const Logger = createLogger({ name: 'WEBHOOK' })

// FIXME(felipeblassioli): Logger should be improved to carry breadcrumbs
// In this case this function is unnecessary.
// OBS: As os 2021-06-17 IG lint doesn't allow { ...obj1, ...obj2 }
/**
 * Merges objects under the 'context key'.
 * Usage:
 *   withContext({ a: 1, b: 2 }, {c:3}, {d: true})
 * returns
 *   { context: { a: 1, b: 2, c: 3, d: true } }
 * @returns { context: mergedObjects }
 */
function withContext() {
  const args = Array.prototype.slice.call(arguments)
  return { context: args.reduce((acc, cur) => Object.assign({}, acc, cur), {}) }
}

function responseToJsonString({
  status,
  statusText,
  headers,
  config,
  method,
  url,
  data
}) {
  return JSON.stringify({
    status,
    statusText,
    headers: headers,
    config: config,
    method,
    url,
    data
  })
}

// Using upsert will not trigger middlewares
async function createOrUpdate(event) {
  let doc = await WebHookEvent.findById(event._id)
  if (!doc) {
    return WebHookEvent.create(event)
  }

  for (const key in event) {
    doc[key] = event[key]
  }

  return doc.save()
}

function sendRequest({ webhookSecret, event, url }, doc, context) {
  const body = R.omit(['deleted'], webHookEventResponder(doc))

  Logger.debug(
    withContext(context, { event: JSON.stringify(event) }),
    'sending-webhook-request'
  )
  return request.post(url, body, {
    responseType: 'text',
    headers: {
      'Content-Type': 'application/json',
      'WebHook-Signature': generateSignature(body, webhookSecret)
    }
  })
}

const messageSchema = Joi.object({
  webhookSecret: Joi.string()
    .label('webhookSecret')
    .description(
      'A SHA-256 HMAC key. Minimum length is 32 bytes and a key longer than 64 bytes will be hashed before it is used.'
    )
    .example('ZD8io2g60IBmm0IzIEkOkFJGImsA64BB0cHY3jqgpVeW2iaorpuhEIpgI9fEtBp5')
    .min(32)
    .required(),

  event: Joi.object({
    // FIXME: id field should be mandatory
    id: Joi.string(),
    _id: Joi.string(),
    name: Joi.string().required(),
    model: Joi.string().required(),
    model_id: Joi.string().required(),
    company_id: Joi.string().required(),
    old_status: Joi.string().allow(null),
    current_status: Joi.string().required(),
    payload: Joi.string().required()
  })
    .label('event')
    .description('The webhook event.')
    .example(
      '{"webhookSecret":"ZD8io2g60IBmm0IzIEkOkFJGImsA64BB0cHY3jqgpVeW2iaorpuhEIpgI9fEtBp5","event":{"name":"acquisition_status_update","model":"acquisition_order","model_id":"ec19c470-fe56-4367-8ba8-9edb811202d2","company_id":"6022e1709af07f00063e12fc","old_status":"refused","current_status":"refused","payload":"{\\"order_id\\":\\"ec19c470-fe56-4367-8ba8-9edb811202d2\\",\\"lead_id\\":\\"f35961e9-2f14-4310-9654-34cf87902e44\\",\\"campaign_id\\":\\"f3be56d4-f6e0-4fe3-9752-69a213f993ff\\",\\"status\\":\\"refused\\"}","id":"60cbb8fc2efa5b0006efceda"},"url":"https://hash.com.br","payload":{"order_id":"ec19c470-fe56-4367-8ba8-9edb811202d2","lead_id":"f35961e9-2f14-4310-9654-34cf87902e44","campaign_id":"f3be56d4-f6e0-4fe3-9752-69a213f993ff","status":"refused"}}'
    )
    .required()
    .unknown(true),

  url: Joi.string()
    .label('url')
    .description('The target URL of the webhook POST request. Must be https.')
    .example('https://example.org')
    .uri({ scheme: ['https'] })
    .required(),

  payload: Joi.object()
    .label('payload')
    .description('The payload of the webhook')
    .example(
      `
    {
      "order_id": "ec19c470-fe56-4367-8ba8-9edb811202d2",
      "lead_id": "f35961e9-2f14-4310-9654-34cf87902e44",
      "campaign_id": "f3be56d4-f6e0-4fe3-9752-69a213f993ff",
      "status": "refused"
    }`
    )
    .required()
    .unknown(true)
})

/**
 * This function sends a POST request to a target URL with a webhook payload.
 * Each request is signed using SHA-256.
 * The target endpoint must return 200, in this case it is assumed that the webhook
 * is delivered.
 *
 * Delivery information is saved in the `webhookddeveliries` MongoDB collection.
 * The actual webhook is saved in the `webhookevents` MongoDB collection.
 *
 * TODO(felipeblassioli): explain the retry mechanism of the develired
 *
 * @param msg - An object that follows the MessageSchema
 * Example message:
 * {
 *   "webhookSecret": "06488635-7162-4e65-ae99-397daf5ab906",
 *   "event": {
 *      "name": "acquisition_status_update",
 *      "model": "acquisition_order",
 *      "model_id": "ec19c470-fe56-4367-8ba8-9edb811202d2",
 *      "company_id": "6022e1709af07f00063e12fc",
 *      "old_status": "refused",
 *      "current_status": "refused",
 *      "payload": "{\"order_id\":\"ec19c470-fe56-4367-8ba8-9edb811202d2\",\"lead_id\":\"f35961e9-2f14-4310-9654-34cf87902e44\",\"campaign_id\":\"f3be56d4-f6e0-4fe3-9752-69a213f993ff\",\"status\":\"refused\"}",
 *      "id": "60cbb8fc2efa5b0006efceda"
 *    },
 *    "url": "https://hash.com.br",
 *    "payload": {
 *      "order_id": "ec19c470-fe56-4367-8ba8-9edb811202d2",
 *      "lead_id": "f35961e9-2f14-4310-9654-34cf87902e44",
 *      "campaign_id": "f3be56d4-f6e0-4fe3-9752-69a213f993ff",
 *      "status": "refused"
 *	  }
 */
async function webhookHandler(msg, retryCount) {
  const context = {
    operationId: cuid(),
    msg: JSON.stringify(msg),
    retryCount
  }

  try {
    if (typeof msg.payload === 'string') {
      msg.payload = JSON.parse(msg.payload)
    }

    Joi.attempt(msg, messageSchema)
  } catch (err) {
    Logger.error({ err, webhookMsg: msg }, 'webhookhandler-joi-error')
    throw err
  }

  const { event, url } = msg
  event._id = event._id || event.id || mongoose.Types.ObjectId()

  try {
    const doc = await createOrUpdate(event)
    assert(doc, 'webhookHandler - createOrUpdate invalid webhook event')

    const response = await sendRequest(msg, doc, context)
    Logger.debug(
      withContext(context, { response: responseToJsonString(response) }),
      'response-received'
    )

    await WebHookDelivery.create({
      event: event.name,
      event_id: event._id,
      status_code: response.status,
      status_text: response.statusText,
      url,
      payload: JSON.stringify(response.config.data),
      config: JSON.stringify(response.config),
      headers: JSON.stringify(response.headers),
      response: JSON.stringify(response.data)
    })

    await WebHookEvent.updateOne({ _id: event._id }, { delivered: true })

    Logger.info(
      withContext(context, { event, url }),
      'webhook-delivery-persisted'
    )
  } catch (err) {
    err.context = context
    Logger.error({ err }, 'failed-to-deliver-webhook')

    if (err.response) {
      await WebHookDelivery.create({
        event: event.name,
        event_id: event._id,
        status_code: err.response.status,
        status_text: err.response.statusText,
        url,
        payload: JSON.stringify(err.config.data),
        config: JSON.stringify(err.config),
        headers: JSON.stringify(err.response.headers),
        response: JSON.stringify(err.response.data)
      })
    } else if (err.request) {
      const statusText = err.code || err.message
      await WebHookDelivery.create({
        event: event.name,
        event_id: event._id,
        status_code: 600,
        status_text: statusText,
        url,
        payload: JSON.stringify(err.config.data),
        config: JSON.stringify(err.config),
        headers: null,
        response: null
      })
    }

    throw err
  }
}

export default webhookHandler
