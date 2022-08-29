import { mapModel } from 'application/core/helpers/responder'

export function registeredMccResponder(model) {
  return mapModel(model, mcc => {
    return {
      object: 'mcc',
      mcc: mcc.mcc || '',
      cnae: mcc.cnae || '',
      description: mcc.description || '',
      enabled: mcc.enabled || false
    }
  })
}
