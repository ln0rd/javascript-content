import { mapModel } from 'application/core/helpers/responder'

export function agreementResponder(model) {
  return mapModel(model, agreement => {
    return {
      agreement_id: agreement._id.toString(),
      title: agreement.title,
      description: agreement.description,
      url: agreement.url,
      accepted: agreement.accepted
    }
  })
}
