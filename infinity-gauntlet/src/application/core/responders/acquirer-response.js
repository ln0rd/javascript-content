import { mapModel } from 'application/core/helpers/responder'

export function acquirerResponseResponder(model) {
  return mapModel(model, response => {
    return {
      object: 'acquirer-response',
      acquirer: response.acquirer || '',
      message: response.message || '',
      type: response.type || '',
      response_code: response.response_code || ''
    }
  })
}
