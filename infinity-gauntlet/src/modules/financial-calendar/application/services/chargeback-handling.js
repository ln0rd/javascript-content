import moment from 'moment'

import createLogger from 'framework/core/adapters/logger'

import CompanyRepository from 'modules/financial-calendar/infrastructure/repositories/company'
import PayableRepository from 'modules/financial-calendar/infrastructure/repositories/payables'
import TransactionRepository from 'modules/financial-calendar/infrastructure/repositories/transaction'
import AffiliationRepository from 'modules/financial-calendar/infrastructure/repositories/affiliation'
import * as ChargebackResponsibilityProportionalToSplit from 'modules/financial-calendar/domain/chargeback-handling/policies/responsibility-proportional-to-splits'
import * as AssignedToOriginCompany from 'modules/financial-calendar/domain/chargeback-handling/policies/assigned-to-origin-company'
import sendWebHook from 'application/webhook/helpers/deliverer'
import { transactionResponder } from 'application/core/responders/transaction'
import { transactionPayablesResponder } from 'application/core/responders/webhook/transaction-payables'

import { CHARGEDBACK } from 'application/core/models/transaction'

import { PROPORTIONAL_TO_SPLIT } from 'modules/financial-calendar/domain/chargeback-handling'

const Logger = createLogger({
  name: 'CHARGEBACK_HANDLING_SERVICE'
})

export default class ChargebackHandlingService {
  constructor() {
    this.payableRepository = new PayableRepository()
    this.companyRepository = new CompanyRepository()
    this.transactionRepository = new TransactionRepository()
    this.affiliationRepository = new AffiliationRepository()
    this.policies = [
      ChargebackResponsibilityProportionalToSplit,
      AssignedToOriginCompany
    ]
  }

  /**
   * Defines which handling policy should be used to handle this chargeback.
   * The logics for that are split between the policies themselves, and may use
   * supplied parameters to confirm their applicability.
   *
   * @param {String} originCompanyId
   * @param {String} provider
   * @returns {Promise<AssignedToOriginCompany|ChargebackResponsibilityProportionalToSplit>}
   */
  async definePolicy(originCompanyId, provider) {
    const affiliation = await this.affiliationRepository.findByCompanyIdAndProvider(
      originCompanyId,
      provider,
      'chargeback_handling_policy'
    )

    const { chargeback_handling_policy: chargebackHandlingPolicy } = affiliation

    const policy = this.policies.find(strat =>
      strat.isApplicable(chargebackHandlingPolicy)
    )

    if (!policy) {
      Logger.error(
        { originCompanyId, provider },
        'no-policy-found-for-chargeback'
      )
      return ChargebackResponsibilityProportionalToSplit
    }

    return policy
  }

  /**
   * Defines a policy and uses it to handle generate new chargeback payables,
   * which are then persisted and the original payables are updated.
   *
   * @param {[Payable]} payables
   * @param {Transaction} transaction
   * @return {Promise<{Object}>} param A parameters object containing the transaction data.
   */
  async handleNewChargeback({ payables, transaction }) {
    const {
      _id: transactionId,
      company_id: originCompanyId,
      provider
    } = transaction

    const chargebackHandlingPolicy = await this.definePolicy(
      originCompanyId,
      provider
    )

    const participatingCompanyIds = [
      ...new Set(payables.map(p => p.company_id))
    ]

    const companies = await this.companyRepository.findByIds(
      participatingCompanyIds
    )

    const chargebackDebitPayables = chargebackHandlingPolicy.apply({
      payables,
      companies
    })

    Logger.info(
      { chargebackDebitPayables: JSON.stringify(chargebackDebitPayables) },
      'policy-generated-payables'
    )

    let createdPayables
    try {
      createdPayables = await this.payableRepository.create(
        chargebackDebitPayables
      )
    } catch (err) {
      Logger.error({ err }, 'failed-to-write-chargeback-payables')
      throw err
    }

    Logger.info(
      { createdPayables: JSON.stringify(createdPayables) },
      'chargeback-payables-created-successfully'
    )

    const payablesToAdvance = chargebackHandlingPolicy.getFuturePayablesIdsToAdvance(
      {
        payables,
        companies
      }
    )

    try {
      await this.payableRepository.updateByIds(payablesToAdvance, {
        payment_date: moment().format('YYYY-MM-DD')
      })
    } catch (err) {
      Logger.error({ err }, 'failed-to-write-chargeback-payables')
      throw err
    }

    Logger.info(
      { payableIds: JSON.stringify(payablesToAdvance) },
      'updated-original-payables-successfully'
    )

    try {
      await this.transactionRepository.updateByIds(transactionId, {
        status: CHARGEDBACK,
        updated_at: moment()
      })
    } catch (err) {
      Logger.error({ err }, 'failed-to-update-transaction-status')
      throw err
    }

    Logger.info(
      { transaction_id: transactionId },
      'updated-transaction-status-successfully'
    )

    let updatedTransaction
    try {
      updatedTransaction = await this.transactionRepository.findOne({
        _id: transactionId
      })
    } catch (err) {
      Logger.error({ err }, 'failed-to-get-transaction')
      throw err
    }

    Logger.info(
      { transaction_id: transactionId },
      'get-updated-transaction-successfully'
    )

    // Create webhook for transaction_chargedback event
    try {
      await sendWebHook(
        updatedTransaction.iso_id,
        'transaction_chargedback',
        'transaction',
        updatedTransaction._id.toString(),
        'paid',
        'chargedback',
        transactionResponder(updatedTransaction)
      )
    } catch (err) {
      Logger.error(
        { err },
        'failed-to-create-transaction-chargedback-webhook-event'
      )
      throw err
    }

    Logger.info(
      { transaction_id: transactionId },
      'transaction-chargedback-webhook-created-successfully'
    )

    // Create webhook for transaction_chargeback_payables_created event
    try {
      await sendWebHook(
        updatedTransaction.iso_id,
        'transaction_chargeback_payables_created',
        'transaction',
        updatedTransaction._id.toString(),
        null,
        'waiting_funds',
        transactionPayablesResponder(createdPayables, updatedTransaction)
      )
    } catch (err) {
      Logger.error(
        { err },
        'failed-to-create-transaction-chargeback-payables-created-webhook-event'
      )
      throw err
    }

    Logger.info(
      { transaction_id: transactionId },
      'transaction-chargeback-payables-created-webhook-created-successfully'
    )

    return createdPayables
  }

  /**
   * Fetch chargeback_handling_policy defined in parent company and return this value,
   * if not find will return PROPORTIONAL_TO_SPLIT
   * This function it's used to create a new affiliation for a company using parent settings to defined which chargeback_handling_policy
   * @param {Company} company
   * @param {String} provider
   * @return {Promise<chargeback_handling_policy>}
   */
  async getChargebackHandlingPolicyFromParentCompany(company, provider) {
    if (!('parent_id' in company)) {
      return PROPORTIONAL_TO_SPLIT
    }
    const { parent_id: parentId } = company

    const parentAffiliation = await this.affiliationRepository.findByCompanyIdAndProvider(
      parentId,
      provider,
      'chargeback_handling_policy'
    )

    return parentAffiliation &&
      'chargeback_handling_policy' in parentAffiliation
      ? parentAffiliation.chargeback_handling_policy
      : PROPORTIONAL_TO_SPLIT
  }
}
