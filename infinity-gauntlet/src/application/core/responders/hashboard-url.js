import { mapModel } from 'application/core/helpers/responder'

export function hashboardUrlResponder(model) {
  return mapModel(model, url => {
    return {
      object: 'hashboard-url',
      id: url._id,
      enabled: url.enabled,
      hashboard: url.hashboard,
      url: url.url
    }
  })
}
