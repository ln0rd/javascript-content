import { mapModel } from 'application/core/helpers/responder'

export function webHookEventResponder(model) {
  return mapModel(model, event => {
    return {
      object: 'webhook_event',
      id: event._id || null,
      name: event.name || null,
      model: event.model || null,
      model_id: event.model_id || null,
      company_id: event.company_id || null,
      old_status: event.old_status || null,
      current_status: event.current_status || null,
      payload: event.payload || null,
      delivered: event.delivered,
      created_at: event.created_at || null,
      updated_at: event.updated_at || null
    }
  })
}

export function webHookDeliveryResponder(model) {
  return mapModel(model, delivery => {
    return {
      object: 'webhook_delivery',
      id: delivery._id || null,
      event: delivery.event || null,
      event_id: delivery.event_id || null,
      status_code: delivery.status_code || null,
      status_text: delivery.status_text || null,
      url: delivery.url || null,
      payload: delivery.payload || null,
      config: delivery.config || null,
      headers: delivery.headers || null,
      response: delivery.response || null,
      created_at: delivery.created_at || null,
      updated_at: delivery.updated_at || null
    }
  })
}
