/* eslint-disable no-await-in-loop */
import createLogger from 'framework/core/adapters/logger'
import Affiliation from 'application/core/models/affiliation'
import Company from 'application/core/models/company'
import Payable from 'application/core/models/payable'
import FeeRule from 'application/core/models/fee-rule'

import moment from 'moment'

const LEO_GESTAO_ID = '5cf141b986642840656717f0'

const Logger = createLogger({
  name: 'MANUAL_FIX_LEO_TRANSACTION_ANTICIPATION_FEES'
})

export default class ManualFixLeoTransactionAnticipationFees {
  static type() {
    return 'manual'
  }

  /**
   * 30/08/19: Temporary fix to recalculate anticipation fees of Leo's merchants
   *
   * For each Marceneiro Payable we recalculate their fees and
   * update their ISO's payable accordingly.
   *
   * Rationale given by João Miranda in 26/08/19:
   * - Pegar os payables dos marceneiros, com anticipation_fee maior que 0.
   * - Remover o anticipation_fee do fee atual.
   * - Recalcular o anticipation_fee baseado apenas no amount liquido daquele payable (amount - fee)
   * - Adicionar o anticipation_fee novo ao fee do payable
   */
  static async handler() {
    const leoMarceneiros = await Company.find({
      parent_id: LEO_GESTAO_ID,
      $or: [
        { 'company_metadata.is_loja_leo': { $exists: false } },
        { 'company_metadata.is_loja_leo': false }
      ]
    })
      .select('_id costs')
      .lean()
      .exec()

    Logger.info({ size: leoMarceneiros.length }, 'marceneiros-found')

    for (const marceneiro of leoMarceneiros) {
      Logger.info({ id: marceneiro._id }, 'current-marceneiro')
      const payablesOfTheCurrentMarceneiro = await Payable.find({
        origin_company_id: marceneiro._id,
        company_id: marceneiro._id,
        created_at: {
          $gte: moment()
            .subtract(1, 'day')
            .startOf('day')
        },
        status: 'waiting_funds',
        anticipation_fee: { $gt: 0 },
        anticipation: { $exists: false }
      }).exec()

      Logger.info(
        {
          size: payablesOfTheCurrentMarceneiro.length,
          companyId: marceneiro._id
        },
        'found-payables-for-marceneiro'
      )
      await fixOriginCompanyPayables(
        payablesOfTheCurrentMarceneiro,
        marceneiro._id
      )
    }
  }

  /**
   * @param {Number} transactionId
   * @param {String} originCompanyId
   * @return {Promise<void>}
   */
  static async recalculateByTransaction(transactionId, originCompanyId) {
    const marceneiroPayables = await Payable.find({
      transaction_id: transactionId,
      origin_company_id: originCompanyId,
      company_id: originCompanyId,
      status: 'waiting_funds',
      anticipation_fee: { $gt: 0 },
      anticipation: { $exists: false }
    }).exec()

    Logger.info(
      {
        size: marceneiroPayables.length,
        companyId: originCompanyId
      },
      'found-payables-for-marceneiro'
    )

    await fixOriginCompanyPayables(marceneiroPayables, originCompanyId)
  }
}

export function calculateAnticipationFee(payable, anticipationFee) {
  const howManyDaysThePayableWillBeAnticipated = moment(
    payable.original_payment_date
  ).diff(moment(payable.payment_date), 'days')

  const feePerDay = anticipationFee / 100 / 30

  return Math.ceil(
    feePerDay *
      howManyDaysThePayableWillBeAnticipated *
      (payable.amount - payable.fee - payable.cost)
  )
}

/**
 * @param {Payable} payable
 * @param {FeeRule} feeRule
 * @return {Promise<void>}
 */
export async function updateMarceneiroPayable(payable, feeRule) {
  Logger.info(
    { payableId: payable._id, payable },
    'updating-marceneiro-payable'
  )

  const oldPayableAnticipationFee = payable.anticipation_fee

  payable.fee = payable.fee - oldPayableAnticipationFee

  const feeRuleAnticipationFee = feeRule.anticipation_fee || 1.99

  const newPayableAnticipationFee = calculateAnticipationFee(
    payable,
    feeRuleAnticipationFee
  )

  payable.anticipation_fee = newPayableAnticipationFee
  payable.fee = payable.fee + newPayableAnticipationFee

  payable.recalculated = true
  await payable.save()

  Logger.info(
    {
      payableId: payable._id,
      companyId: payable.company_id,
      oldAnticipationFee: oldPayableAnticipationFee,
      newAnticipationFee: newPayableAnticipationFee
    },
    'updated-anticipation-fee-in-payable'
  )
}

/**
 * @param {Payable} originalPayable
 * @param {Affiliation} marceneiroAffiliation
 * @return {Promise<void>}
 */
export async function updateRelatedLeoPayable(
  originalPayable,
  marceneiroAffiliation
) {
  const leoPayable = await Payable.findOne({
    transaction_id: originalPayable.transaction_id,
    origin_company_id: originalPayable.origin_company_id,
    installment: originalPayable.installment,
    company_id: LEO_GESTAO_ID
  }).exec()

  if (!leoPayable) {
    Logger.warn(
      { payableId: originalPayable._id },
      'no-corresponding-iso-payable'
    )
    return
  }

  Logger.info(
    {
      payableId: leoPayable._id,
      payable: leoPayable
    },
    'updating-iso-payable'
  )

  // We have to remove the old mistakenly calculated anticipation_amount
  // from the ISO Payable and then update with the new amounts calculated
  // in the original payable.
  const oldAnticipationAmount = leoPayable.anticipation_amount
  const oldAmount = leoPayable.amount

  leoPayable.amount = leoPayable.amount - leoPayable.anticipation_amount

  leoPayable.anticipation_amount = originalPayable.anticipation_fee

  leoPayable.amount = leoPayable.amount + leoPayable.anticipation_amount

  // 25/10/20: When the script was first built, we forgot to update the
  // Leo Payable's costs, to reflect the recalculation from Hash -> ISO side
  // as well. If we don't do that, the ISO will pay costs as if 100% was anticipated.
  const anticipationCostPct =
    marceneiroAffiliation.costs.anticipation_cost || 1.99
  const oldCost = leoPayable.cost
  const oldAnticipationCost = leoPayable.anticipation_cost
  const newAnticipationCost = await calculateAnticipationFee(
    originalPayable,
    anticipationCostPct
  )

  // Same as before, we have to do this to preserve other
  // cost amounts not related to anticipation (like mdr_cost)
  leoPayable.cost = leoPayable.cost - leoPayable.anticipation_cost
  leoPayable.anticipation_cost = newAnticipationCost
  leoPayable.cost = leoPayable.cost + leoPayable.anticipation_cost

  leoPayable.recalculated = true
  await leoPayable.save()

  Logger.info(
    {
      payableId: leoPayable._id,
      oldAnticipationAmount,
      oldAmount,
      newAmount: leoPayable.amount,
      newAnticipationAmount: leoPayable.anticipation_amount,
      oldCost,
      newCost: leoPayable.cost,
      oldAnticipationCost,
      newAnticipationCost
    },
    'updated-values-in-ISO-payable'
  )
}

/**
 * @param {[Payable]} payables
 * @param {String} originCompanyId
 * @return {Promise<void>}
 */
export async function fixOriginCompanyPayables(payables, originCompanyId) {
  const affiliation = await Affiliation.findOne({
    company_id: originCompanyId,
    provider: 'hash'
  })
    .lean()
    .exec()

  const feeRule = await FeeRule.findOne({
    company_id: originCompanyId
  })
    .lean()
    .exec()

  if (!feeRule || !affiliation) {
    Logger.warn(
      {
        company_id: originCompanyId,
        payables: payables.map(({ _id }) => _id),
        feeRule,
        affiliation
      },
      'not-found-fee-rule-affiliation-for-company'
    )
    return
  }

  for (const payable of payables) {
    const refundedPayables = await Payable.find({
      transaction_id: payable.transaction_id,
      type: 'refund'
    })
      .select('_id')
      .lean()
      .exec()
    const trxHasRefundPayables = refundedPayables.length > 0

    if (payable.type === 'refund' || trxHasRefundPayables) {
      Logger.warn(
        {
          payableId: payable._id,
          transactionId: payable.transaction_id
        },
        'skipping-calculation-for-refunded-payables'
      )
    } else {
      try {
        await updateMarceneiroPayable(payable, feeRule)
        await updateRelatedLeoPayable(payable, affiliation)
      } catch (err) {
        Logger.error(
          {
            payableId: payable._id,
            originCompanyId,
            transactionId: payable.transaction_id,
            err
          },
          'update-payable-error'
        )
      }
    }
  }
}
