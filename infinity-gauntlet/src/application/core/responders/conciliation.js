import { createLogger } from '@hashlab/logger'
import { mapModel } from 'application/core/helpers/responder'

const Logger = createLogger({ name: 'CONCILIATION_RESPONDER' })

export function conciliationResponder(model) {
  const conciliationMapResponse = mapModel(model, conciliation => {
    return {
      object: 'conciliation',
      type: conciliation.type,
      id: conciliation._id,
      date: conciliation.date,
      company_id: conciliation.company_id,
      sequential_file: conciliation.conciliated.sequential_file
    }
  })
  Logger.info(
    { response: JSON.stringify(conciliationMapResponse) },
    'conciliation-response'
  )
  return conciliationMapResponse
}

export function conciliationResponderAddCompanyData(model, companyData = {}) {
  return mapModel(model, conciliation => {
    return Object.assign(conciliation, {
      company: {
        id: companyData._id,
        name: companyData.name,
        company_metadata: companyData.company_metadata
      }
    })
  })
}
