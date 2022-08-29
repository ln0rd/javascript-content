import { mapModel } from 'application/core/helpers/responder'

export function mccResponder(model) {
  return mapModel(model, mcc => {
    return {
      object: 'mcc',
      id: mcc._id || null,
      mcc: mcc.mcc || null,
      hash_markup: mcc.hash_markup || null,
      provider: mcc.provider || null,
      anticipation_cost: mcc.anticipation_cost || null,
      minimum_anticipation_fee: mcc.minimum_anticipation_fee || null,
      minimum_brands_fee: mcc.minimum_brands_fee || null,
      brands: mcc.brands || null,
      company_id: mcc.company_id || null,
      created_at: mcc.created_at || null,
      updated_at: mcc.updated_at || null
    }
  })
}
