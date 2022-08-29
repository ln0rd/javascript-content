import { mapModel } from 'application/core/helpers/responder'

export function permissionResourceResponder(model) {
  return mapModel(model, resource => {
    return {
      object: 'permission-resource',
      id: resource._id,
      permits: {
        create: resource.permits.create,
        read: resource.permits.read,
        update: resource.permits.update,
        delete: resource.permits.delete
      },
      name: resource.name,
      description: resource.description,
      enabled: resource.enabled,
      public: resource.public
    }
  })
}
