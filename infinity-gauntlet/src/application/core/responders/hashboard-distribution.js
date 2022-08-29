import { mapModel } from 'application/core/helpers/responder'

export function hashboardDistributionResponder(model) {
  return mapModel(model, distribution => {
    return {
      object: 'distribution',
      id: distribution._id,
      provider: distribution.provider,
      name: distribution.name,
      description: distribution.description,
      provider_id: distribution.provider_id,
      enabled: distribution.enabled
    }
  })
}
