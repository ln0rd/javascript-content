import { mapModel } from 'application/core/helpers/responder'
import { hashboardDistributionResponder } from 'application/core/responders/hashboard-distribution'

export function hashboardDeploymentResponder(model) {
  return mapModel(model, deployment => {
    return {
      object: 'deployment',
      id: deployment._id,
      environment: deployment.environment,
      name: deployment.name,
      description: deployment.description,
      enabled: deployment.enabled,
      infrastructure_provider: deployment.infrastructure_provider,
      distributions: deployment.distributions
        ? hashboardDistributionResponder(deployment.distributions)
        : []
    }
  })
}
