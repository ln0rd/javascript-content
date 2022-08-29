import { mapModel } from 'application/core/helpers/responder'

export function bankResponder(model) {
  return mapModel(model, bank => {
    return {
      object: 'bank',
      id: '',
      name: bank.name || null,
      code: bank.str_code || null,
      ispbCode: bank.ispb_code || null,
      requireBranchDigit: bank.require_branch_digit || false,
      ispbBranchCode: bank.ispb_branch_code || []
    }
  })
}
