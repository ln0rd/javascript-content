import assert from 'assert'

import * as ChargebackDebitPayable from 'modules/financial-calendar/domain/chargeback-debit-payable'
import { ASSIGNED_TO_ORIGIN_COMPANY } from 'modules/financial-calendar/domain/chargeback-handling'

/**
 * @param {[]} payables
 * @param {[]} companies
 * @returns {{originCompany: {}, iso: {}|undefined}}
 */
function identifyParticipatingCompanies({ payables, companies = [] }) {
  assert(
    companies.length > 0,
    'The participating companies parameter cannot be empty'
  )

  const merchantId = payables[0].origin_company_id.toString()

  if (!companies.includes(merchantId)) {
    companies.push({
      _id: merchantId,
      parent_id: payables[0].iso_id.toString()
    })
  }

  const originCompany = companies.find(
    company => company._id.toString() === merchantId
  )

  let iso
  if (originCompany) {
    iso = companies.find(
      company => company._id.toString() === originCompany.parent_id.toString()
    )
  }

  return { iso, originCompany }
}

function assignedToOriginCompany({ payables, companies = [] }) {
  const { iso } = identifyParticipatingCompanies({ payables, companies })
  const newPayables = payables
    .filter(payable => payable.type === 'credit')
    .map(payable => {
      const newPayable = ChargebackDebitPayable.fromCreditPayable(payable)

      // ISOs should take responsibility for their own chargebacks,
      // otherwise we would be charging the customer twice for fees.
      if (!iso || payable.company_id.toString() !== iso._id.toString()) {
        newPayable.company_id = newPayable.origin_company_id
        newPayable.owner_company_id = newPayable.origin_company_id
        newPayable.affiliation_id = newPayable.origin_affiliation_id
      }

      return newPayable
    })

  return newPayables
}

/**
 * Checks if this chargeback handling policy is applicable to the current transaction.
 * @param {String} policy
 * @returns {Boolean}
 */
function isApplicable(policy) {
  return ASSIGNED_TO_ORIGIN_COMPANY === policy
}

/**
 * For assigned to origin company policy, should not advance future payables
 * only iso and origin company payables should be accepted.
 *
 * @param {[]} payables
 * @param {[]} companies
 * @returns {[String]}
 */
function getFuturePayablesIdsToAdvance({ payables, companies = [] }) {
  const { iso, originCompany } = identifyParticipatingCompanies({
    payables,
    companies
  })
  const originCompanyAndIsoPayables = payables.filter(
    ({ status, company_id }) => {
      if (status === 'paid') {
        return false
      }
      const originCompanyId = originCompany._id.toString()
      if (iso) {
        const isoId = iso._id.toString()
        return [isoId, originCompanyId].includes(company_id)
      }
      return originCompanyId === company_id
    }
  )

  return originCompanyAndIsoPayables
    ? originCompanyAndIsoPayables.map(({ _id }) => _id)
    : []
}

export {
  assignedToOriginCompany as apply,
  isApplicable,
  getFuturePayablesIdsToAdvance
}
