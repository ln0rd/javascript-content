import moment from 'moment'
import waitForAllSettled from 'p-settle'
import createLogger from 'framework/core/adapters/logger'
import Payable from 'application/core/models/payable'
import Company from 'application/core/models/company'
import Affiliation from 'application/core/models/affiliation'
import { getNextBusinessDay } from 'application/core/helpers/date'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'

import {
  FLAT,
  getTransactionPricingByAffiliation
} from 'application/core/domain/pricing'

const Logger = createLogger({
  name: 'MANUAL_RESET_LOJA_LEO_ANTICIPATION_PAYMENT_DATE'
})

const LEO_GESTAO_ID = '5cf141b986642840656717f0'

/**
 * As a quickfix we are also restoring the Payment Date
 * of the Loja Leo's Payable to its original payment date, effectively
 * cancelling their antecipation as far as settlements are concerned.
 * However, anticipation costs at the ISO Payable are NOT being updated,
 * so they are still accounting for a (now non existent) Loja Leo anticipation.
 *
 * 05/09/19 - We are also using this task to calculate the MDR costs for these payable
 * which were not being applied before.
 */
export default class ManualResetLojaLeoAnticipationPaymentDate {
  static type() {
    return 'manual'
  }

  static async handler() {
    const leoGestaoPayables = await Payable.find({
      company_id: LEO_GESTAO_ID,
      created_at: {
        $gte: moment()
          .subtract(1, 'day')
          .startOf('day')
      },
      status: 'waiting_funds'
    }).exec()
    await fixLojaLeoPayables(leoGestaoPayables)
  }

  static async recalculateByTransaction(transactionId) {
    const leoGestaoPayables = await Payable.find({
      company_id: LEO_GESTAO_ID,
      status: 'waiting_funds',
      transaction_id: transactionId
    }).exec()
    await fixLojaLeoPayables(leoGestaoPayables)
  }
}

async function fixLojaLeoPayables(leoGestaoPayables) {
  if (leoGestaoPayables.length === 0) {
    Logger.warn({}, 'no-leo-gestao-payables-found')
    return
  }

  const updateExecutionPromises = leoGestaoPayables.map(payable =>
    resetLojaLeoAnticipationPaymentDate(payable)
  )

  const results = await waitForAllSettled(updateExecutionPromises)
  const failures = results.filter(operation => operation.isRejected)

  Logger.info(
    { failures: failures.length, total: results.length },
    'finished-updating-loja-leo-payment-dates'
  )

  // Cost calculation updates
  Logger.info({}, 'starting-loja-leo-cost-calculations')

  const costUpdatePromises = leoGestaoPayables.map(payable =>
    updateMDRCosts(payable)
  )

  const costResults = await waitForAllSettled(costUpdatePromises)
  const costFailures = results.filter(operation => operation.isRejected)

  Logger.info(
    { failures: costFailures.length, total: costResults.length },
    'finished-updating-loja-leo-payable-costs'
  )
}

async function resetLojaLeoAnticipationPaymentDate(gestaoPayable) {
  const lojaLeoPayables = await Payable.find({
    transaction_id: gestaoPayable.transaction_id,
    installment: gestaoPayable.installment,
    origin_company_id: gestaoPayable.origin_company_id,
    type: 'credit',
    company_id: {
      // If the company is not Leo Gestao nor the Merchant, it is Loja Leo
      $nin: [LEO_GESTAO_ID, gestaoPayable.origin_company_id]
    }
  })
    .sort({ created_at: 1 }) // Prefer the oldest so we skip possible newer adjustment payables matching the same criteria
    .limit(1)
    .exec()

  const lojaLeoPayable = lojaLeoPayables[0]

  if (!lojaLeoPayable) {
    Logger.warn(
      { payableId: gestaoPayable._id },
      'no-corresponding-loja-leo-payable'
    )

    return
  }

  const lojaLeo = await Company.findOne(
    {
      _id: lojaLeoPayable.company_id
    },
    { anticipation_type: 1 }
  )
    .exec()
    .catch(err => {
      // in case of error it should just log and assume the default
      Logger.warn({ err }, 'failed-fetching-loja-leo-anticipation-config')
    })

  if (!lojaLeo || !lojaLeo.anticipation_type) {
    // If it's unavailable, we must assume the "default" of canceling the wrong anticipation
    Logger.warn({}, 'loja-leo-anticipation-config-unavailable')
  } else if (lojaLeo.anticipation_type === 'automatic') {
    Logger.info(
      { lojaLeo: lojaLeoPayable.company_id },
      'skipping-date-reset-for-automatic-configured-loja-leo'
    )

    return
  }

  /**
   * 22/10/2019: We found out that the script
   * was changing the payment date of Payables
   * that were refunded. Refund Payables kept
   * their payment date of D+1 but we were changing
   * the original Payables' dates to the future, so
   * Lojas Leo ended up paying something they shouldn't
   *
   * We must now check if it was refunded before changing
   * the payment dates.
   */
  const refundPayable = await Payable.findOne({
    transaction_id: lojaLeoPayable.transaction_id,
    installment: lojaLeoPayable.installment,
    type: 'refund',
    company_id: lojaLeoPayable.company_id
  }).exec()

  if (refundPayable) {
    Logger.info(
      { payableId: gestaoPayable._id, refundPayableId: refundPayable._id },
      'loja-leo-payable-has-refund-counterpart'
    )

    return
  }

  if (!lojaLeoPayable.original_payment_date || !lojaLeoPayable.anticipated) {
    Logger.warn(
      { payableId: lojaLeoPayable._id },
      'loja-leo-payable-not-anticipated'
    )

    return
  }

  /**
   * 06/02/2020: was added this validation to enable spot anticipation payables to anticipate,
   * so now this payables will be ignored
   * more info: https://hashlab.slack.com/archives/CPU2X8PHD/p1580835486004400
   */
  if (lojaLeoPayable.anticipation) {
    Logger.warn(
      { payableId: lojaLeoPayable._id },
      'loja-leo-spot-anticipation-payable-ignored'
    )
    return
  }

  Logger.info(
    {
      payableId: lojaLeoPayable._id,
      payable: JSON.stringify(lojaLeoPayable)
    },
    'updating-loja-leo-payable'
  )

  const oldPaymentDate = lojaLeoPayable.payment_date

  lojaLeoPayable.payment_date = lojaLeoPayable.original_payment_date
  lojaLeoPayable.anticipated = false
  lojaLeoPayable.anticipatable = true

  await lojaLeoPayable.save()

  Logger.info(
    {
      payableId: lojaLeoPayable._id,
      oldPaymentDate,
      newPaymentDate: lojaLeoPayable.original_payment_date
    },
    'updated-loja-leo-payable-payment-date'
  )
}

async function updateMDRCosts(gestaoPayable) {
  const lojaLeoPayables = await Payable.find({
    transaction_id: gestaoPayable.transaction_id,
    installment: gestaoPayable.installment,
    origin_company_id: gestaoPayable.origin_company_id,
    company_id: {
      // If the company is not Leo Gestao nor the Merchant, it is Loja Leo
      $nin: [LEO_GESTAO_ID, gestaoPayable.origin_company_id]
    },
    status: 'waiting_funds'
  }).exec()

  if (!lojaLeoPayables || lojaLeoPayables.length <= 0) {
    Logger.warn(
      { payableId: gestaoPayable._id },
      'no-corresponding-loja-leo-payable'
    )

    return
  }

  const hasRefundedPayables = lojaLeoPayables.some(
    ({ type }) => type === 'refund'
  )

  if (hasRefundedPayables) {
    Logger.warn(
      {
        leoGestaoPayableId: gestaoPayable._id,
        transaction_id: gestaoPayable.transaction_id
      },
      'skipping-calculation-for-refunded-payables'
    )
    return
  }

  return Promise.all(lojaLeoPayables.map(recalculatePayableCosts))
}

async function recalculatePayableCosts(payable) {
  const companyId = payable.company_id
  const payableId = payable._id

  const lojaLeo = await Company.findOne(
    {
      _id: companyId
    },
    { _id: 1, anticipation_type: 1, anticipation_days_interval: 1 }
  )
    .exec()
    .catch(err => {
      // in case of error it should just log and assume the default
      Logger.warn({ err }, 'failed-fetching-loja-leo-anticipation-config')
    })

  if (!lojaLeo) {
    Logger.error({ companyId }, 'no-loja-leo-found')

    throw ModelNotFoundError('pt-br', 'company')
  }

  const affiliation = await Affiliation.findOne({
    company_id: companyId,
    provider: 'hash',
    enabled: true,
    status: 'active'
  })
    .select('_id costs')
    .lean()
    .exec()

  if (!affiliation) {
    Logger.error({ companyId }, 'no-affiliation-found')

    throw ModelNotFoundError('pt-br', 'affiliation')
  }

  Logger.info(
    { affiliationId: affiliation._id },
    'taking-costs-from-found-affiliation'
  )

  const transaction = {
    payment_method: payable.payment_method,
    installments: payable.total_installments,
    card: {
      brand: payable.card_brand
    }
  }
  const { mdr_amount: mdr, mdr_type } = getTransactionPricingByAffiliation(
    transaction,
    affiliation
  )

  let mdrCost = Math.ceil(mdr / 100 * payable.amount)

  if (mdr_type === FLAT) {
    Logger.info(
      {
        mdr,
        mdr_type,
        payable_id: payableId,
        payable_cost: payable.cost
      },
      'flat-mdr-type-is-not-applicable-to-update'
    )
    return payable
  }

  let anticipationCost = 0

  if (
    lojaLeo.anticipation_type === 'automatic' &&
    payable.payment_method === 'credit_card'
  ) {
    Logger.info(
      { companyId: lojaLeo._id, payableId },
      'will-recalculate-anticipation'
    )

    let costValues
    try {
      costValues = await recalculateAnticipationValues(
        payable,
        lojaLeo,
        affiliation.costs.anticipation_cost
      )
    } catch (err) {
      Logger.error({ err }, 'failed-to-recalculate-anticipation-values')

      throw err
    }

    Logger.info(costValues, 'recalculated-values')

    payable.original_payment_date = costValues.originalPaymentDate
    payable.payment_date = costValues.paymentDate
    payable.anticipated = true
    payable.anticipatable = false

    Logger.info(
      {
        paymentDate: costValues.paymentDate,
        originalPaymentDate: costValues.originalPaymentDate,
        anticipationCost: costValues.anticipationCost
      },
      'applying-auto-anticipation-values'
    )

    anticipationCost = costValues.anticipationCost
  } else {
    Logger.info({ companyId, payableId }, 'payable-should-not-be-anticipated')
  }

  payable.mdr_cost = mdrCost
  payable.anticipation_cost = anticipationCost
  payable.cost = mdrCost + anticipationCost
  payable.recalculated = true

  Logger.info(
    {
      mdrCost,
      mdr,
      anticipationCost,
      cost: mdrCost + anticipationCost,
      payableId
    },
    'applying-new-cost-to-payable'
  )

  try {
    await payable.save()
  } catch (err) {
    Logger.error({ err }, 'failed-to-apply-new-costs-to-payable')

    throw err
  }

  return payable
}

async function recalculateAnticipationValues(
  payable,
  company,
  anticipationCostPct
) {
  let originalPaymentDate
  let paymentDate

  const anticipationInterval = company.anticipation_days_interval || 1

  if (payable.anticipated && payable.original_payment_date) {
    originalPaymentDate = payable.original_payment_date
    paymentDate = payable.payment_date
  } else {
    originalPaymentDate = payable.payment_date
    paymentDate = await getNextBusinessDay(
      moment(payable.transaction_captured_at).add(anticipationInterval, 'days')
    )
  }

  Logger.info(
    { originalPaymentDate, paymentDate },
    'will-calculate-anticipation-costs'
  )

  const howManyDaysThePayableWillBeAnticipated = moment(
    originalPaymentDate
  ).diff(moment(paymentDate), 'days')

  const costPerDay = anticipationCostPct / 100 / 30

  const anticipationCost = Math.ceil(
    costPerDay *
      howManyDaysThePayableWillBeAnticipated *
      (payable.amount - payable.fee - payable.cost)
  )

  return {
    paymentDate: moment(paymentDate).format('YYYY-MM-DD'),
    originalPaymentDate: moment(originalPaymentDate).format('YYYY-MM-DD'),
    anticipationCost
  }
}
