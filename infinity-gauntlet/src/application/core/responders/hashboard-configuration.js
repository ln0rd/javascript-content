import { mapModel } from 'application/core/helpers/responder'

export function hashboardConfigurationResponder(model) {
  return mapModel(model, configuration => {
    return {
      object: 'hashboard-configuration',
      id: configuration._id,
      enabled: configuration.enabled,
      hashboard: configuration.hashboard
    }
  })
}
