import R from 'ramda'
import { mapModel } from 'application/core/helpers/responder'

export function permissionResponder(model) {
  return mapModel(model, permission => {
    return {
      object: 'permission',
      id: permission._id,
      name: permission.name,
      description: permission.description,
      enabled: permission.enabled,
      create: R.map(perm => perm.name, permission.create),
      read: R.map(perm => perm.name, permission.read),
      update: R.map(perm => perm.name, permission.update),
      delete: R.map(perm => perm.name, permission.delete)
    }
  })
}
