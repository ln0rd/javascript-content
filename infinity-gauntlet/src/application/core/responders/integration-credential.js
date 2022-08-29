import { mapModel } from 'application/core/helpers/responder'

export function integrationCredentialResponder(model) {
  return mapModel(model, credential => {
    return {
      object: 'integration_credential',
      id: credential._id,
      name: credential.name,
      password: credential.password || null,
      username: credential.username || null,
      key: credential.key || null,
      created_at: credential.created_at || null,
      updated_at: credential.updated_at || null,
      company_id: credential.company_id
    }
  })
}
