import { mapModel } from 'application/core/helpers/responder'
import { permissionResponder } from 'application/core/responders/permission'
import { validateUuid } from 'application/core/helpers/uuid'

export function apiKeyResponder(model, raw) {
  return mapModel(model, apiKey => {
    return {
      object: 'api-key',
      id: apiKey._id,
      name: apiKey.name,
      description: apiKey.description,
      enabled: apiKey.enabled,
      key: apiKey.key,
      secret: raw
        ? validateUuid(apiKey.secret)
          ? apiKey.secret
          : apiKey.masked_secret || ''
        : apiKey.masked_secret,
      permissions: permissionResponder(apiKey.permissions)
    }
  })
}
