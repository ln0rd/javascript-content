import { mapModel } from 'application/core/helpers/responder'

export function integrationRequestResponder(model) {
  return mapModel(model, intReq => {
    return {
      object: 'integration_request',
      integration: intReq.name,
      id: intReq._id,
      status: intReq.status,
      result: {
        name: intReq.name,
        company_id: intReq.company_id,
        integration_body: intReq.integration_body,
        model: intReq.model,
        model_id: intReq.model_id,
        integration_response: intReq.integration_response,
        request_body: intReq.request_body,
        status: intReq.status
      },
      created_at: intReq.created_at || null,
      updated_at: intReq.updated_at || null,
      company_id: intReq.company_id
    }
  })
}
