import AgreementService from 'application/core/services/agreement'
import ValidationError from 'framework/core/errors/validation-error'
import { validate } from 'framework/core/adapters/validator'

export default class AgreementEndpoint {
  static async getAll(req, res) {
    const all = await AgreementService.getAll()
    return res.json(200, all)
  }

  static async create(req, res) {
    const params = req.body
    const errors = validate('agreement-new', params)
    if (errors) {
      throw new ValidationError(req.get('locale'), errors)
    }
    const result = await AgreementService.create(params)
    return res.json(201, result)
  }

  static async remove(req, res) {
    const disabled = await AgreementService.disable(req.params.agreement_id)
    return res.json(200, disabled)
  }

  static async getAccepted(req, res) {
    const accepted = await AgreementService.getAccepted(req.get('company').id)
    return res.json(200, accepted)
  }

  static async getPending(req, res) {
    const companyId = req.get('company').id
    const isoId = (await AgreementService.getIsoId(companyId)) || companyId
    const toAccept = await AgreementService.getPending(companyId, isoId)
    return res.json(200, toAccept)
  }

  static async accept(req, res) {
    const params = req.body
    const errors = validate('agreement-accept', params)
    if (errors) {
      throw new ValidationError(req.get('locale'), errors)
    }
    await AgreementService.accept(
      req.get('locale'),
      params.agreement_id,
      req.get('company').id,
      req.get('requesterIpAddress'),
      req.userAgent()
    )
    return res.send(204)
  }
}
