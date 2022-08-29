import { agreementResponder } from 'application/core/responders/agreement'
import Agreement from 'application/core/models/agreement'
import Company from 'application/core/models/company'
import AcceptedAgreement from 'application/core/models/accepted-agreement'

import createLogger from 'framework/core/adapters/logger'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'

const logger = createLogger({ name: 'AGREEMENT_SERVICE' })

const getAll = async () => {
  const all = await Agreement.find()
    .lean()
    .exec()
  return agreementResponder(all)
}

const create = async agreement => {
  const newAgreement = new Agreement(agreement)
  const saved = await newAgreement.save()
  return agreementResponder(saved)
}

const disable = async agreementId => {
  await Agreement.updateOne({ _id: agreementId }, { active: false })
  const result = await Agreement.findOne({ _id: agreementId })
    .lean()
    .exec()
  return agreementResponder(result)
}

const getAcceptedData = async companyId => {
  return AcceptedAgreement.find({
    entity_type: 'company',
    entity_id: companyId
  })
    .lean()
    .exec()
}

const getIsoId = async companyId => {
  const company = await Company.findOne({
    _id: companyId
  })
    .lean()
    .exec()
  return company.parent_id
}

const getPending = async (companyId, isoId) => {
  const accepted = await getAcceptedData(companyId)
  const acceptedIds = accepted.map(x => x.agreement_id)
  const toAccept = await Agreement.find({
    _id: { $nin: acceptedIds },
    iso_id: isoId,
    active: true
  })
  toAccept.forEach(x => (x.accepted = false))
  return agreementResponder(toAccept)
}

const getAccepted = async companyId => {
  const acceptedAgreements = await getAcceptedData(companyId)
  const acceptedIds = acceptedAgreements.map(x => x.agreement_id)
  const accepted = await Agreement.find({
    _id: { $in: acceptedIds },
    active: true
  })
  accepted.forEach(x => (x.accepted = true))
  return agreementResponder(accepted)
}

const accept = async (locale, agreementId, companyId, userIp, userAgent) => {
  const existingAgreement = await Agreement.count({
    _id: agreementId,
    active: true
  })
  if (existingAgreement <= 0) {
    throw new ModelNotFoundError(locale, 'agreement')
  }

  const accepted = await AcceptedAgreement.find({
    entity_type: 'company',
    entity_id: companyId,
    agreement_id: agreementId
  })
    .lean()
    .exec()
  if (accepted && accepted.length > 0) {
    logger.warn('Agreement already accepted, ignoring acceptance request')
    return
  }
  const toInsert = new AcceptedAgreement({
    entity_type: 'company',
    entity_id: companyId,
    agreement_id: agreementId,
    user_ip: userIp,
    user_agent: userAgent
  })
  await toInsert.save()
}

export default {
  getAll,
  create,
  disable,
  getIsoId,
  getPending,
  getAccepted,
  accept
}
