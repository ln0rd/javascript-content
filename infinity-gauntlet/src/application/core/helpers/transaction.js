import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import Payable from 'application/core/models/payable'
import * as cardBrands from 'application/core/domain/card-brands'
import AnticipationFees from 'application/core/domain/anticipation-fees'
import { hasCurrentCompanyIdInSplitRules } from 'application/core/domain/split-rules'
import createLogger from 'framework/core/adapters/logger'
import { getNextBusinessDay } from 'application/core/helpers/date'
import InvalidSplitRuleAmountError from 'application/core/errors/invalid-split-rule-amount-error'
import InvalidSplitRulePercentageError from 'application/core/errors/invalid-split-rule-percentage-error'
import InvalidSplitRuleSameCompanyIdError from 'application/core/errors/invalid-split-rule-same-company-id-error'
import {
  EMV,
  MAGSTRIPE,
  ECOMMERCE,
  CONTACTLESS_ICC,
  CREDIT_CARD,
  DEBIT_CARD,
  BOLETO,
  MONEY
} from 'application/core/domain/methods'
import { PAID, REFUSED } from 'application/core/models/transaction'
import {
  FLAT,
  PERCENTAGE,
  DEFAULT_CARD_MDR_COST,
  DEFAULT_CARD_MDR_FEE,
  getTransactionPricingByFeeRule,
  getTransactionPricingByAffiliation
} from 'application/core/domain/pricing'

const Logger = createLogger({
  name: 'TRANSACTION_HELPER'
})

function decodeBase64(data) {
  return data ? Buffer.from(data, 'base64').toString('utf-8') : data
}

export function getCardBrand(cardNumberOrBin) {
  const cardStartRules = [
    [
      'elo',
      [
        '401178',
        '504175',
        '509002',
        '509003',
        '438935',
        '457631',
        '451416',
        '457632',
        '506726',
        '506727',
        '506739',
        '506741',
        '506742',
        '506744',
        '506747',
        '506748',
        '506778',
        '636297',
        '636368',
        '637095',
        '509048',
        '509067',
        '509049',
        '509069',
        '509050',
        '509074',
        '509068',
        '509045',
        '509051',
        '509046',
        '509066',
        '509047',
        '509042',
        '509052',
        '509043',
        '509064',
        '509040',
        '401179',
        '431274',
        '457393',
        '627780',
        '655000',
        '655001',
        '651652',
        '651653',
        '651654',
        '650485',
        '650486',
        '650487',
        '650488'
      ]
    ],
    ['discover', ['6011', '622', '64', '65']],
    ['diners', ['301', '305', '36', '38']],
    ['amex', ['34', '37']],
    ['aura', ['50']],
    ['jcb', ['35']],
    ['hiper', ['38', '60']],
    ['visa', ['4']],
    ['mastercard', ['5']]
  ]

  const cardRangeRules = {
    elo: [['506699', '506778'], ['509000', '509999']]
  }

  function isWithinRange(cardBrandName, bino) {
    const cardRanges = cardRangeRules[cardBrandName]

    if (!cardRanges) {
      return false
    }

    return cardRanges.some(range => {
      const rangeStart = range[0]
      const rangeEnd = range[1]

      return bino >= rangeStart && bino <= rangeEnd
    })
  }

  const bin = '' + cardNumberOrBin.slice(0, 6)

  const cardRangeRulesLength = Object.keys(cardRangeRules).length

  for (let i = 0; i < cardRangeRulesLength; i += 1) {
    const cardBrandName = Object.keys(cardRangeRules)[i]

    if (isWithinRange(cardBrandName, bin)) {
      return cardBrandName
    }
  }

  for (let i = 0; i < cardStartRules.length; i += 1) {
    const cardStartRule = cardStartRules[i][1]

    for (let j = 0; j < cardStartRule.length; j += 1) {
      const start = cardStartRule[j]

      if (bin.slice(0, start.length) === start) {
        return cardStartRules[i][0]
      }
    }
  }

  return 'unknown'
}

export function normatizeCardBrand(cardBrand) {
  // To avoid errors of leaving brands with an empty string, we are returning the input's own value,
  // typically for cases of undefined and null (will return undefined and null).
  // This behavior is expected given that in the register of the transaction there is a treatment
  // when a card_brand is null or undefined, in cases empty cases, the register respects what was
  // sent in the queue (empty) so because of that we are propagating the same value.
  if (typeof cardBrand !== 'string') {
    return cardBrand
  }

  const lowerCardBrand = cardBrand.toLowerCase()

  switch (lowerCardBrand) {
    case 'maestro':
    case 'credito pan':
    case 'dnb mastercard':
    case 'aura':
    case 'discover':
    case 'unknown':
    case 'mastercard credi':
      return 'mastercard'
    case 'visa electron':
    case 'visaelectron':
    case 'visacredito':
    case 'visa credito':
      return 'visa'
    case 'tae':
    case 'ref':
    case 'ticket restaurante':
      return 'ticket'
    case 'hipercard':
      return 'hiper'
    case 'sodexo pass refeicao':
      return 'sodexo'
    case 'alelo refeicao':
      return 'alelo'
    case 'elo credito':
    case 'elo debito':
      return 'elo'
    case 'cabal credito':
    case 'cabal debito':
      return 'cabal'
    case 'volus credito':
      return 'volus'
    case 'up credito':
      return 'upbrasil'
    default:
      return lowerCardBrand
  }
}

export function calculateInstallmentsAmounts(
  transaction,
  company,
  mdr,
  anticipation
) {
  const days = company.anticipation_days_interval || 1
  const trxAmount = transaction.amount
  const installmentAmount = Math.floor(trxAmount / transaction.installments)
  const firstInstallmentAmount =
    trxAmount - (transaction.installments - 1) * installmentAmount
  const dailyAnticipationfee = anticipation.fee / 30 / 100
  const anticipationType = anticipation.type || 'per_month'
  const mdrFee = mdr.mdr_amount / 100

  const installmentsArray = []
  const result = []

  for (let i = 1; i <= transaction.installments; i += 1) {
    installmentsArray.push(i)
  }

  if (
    company.anticipation_type === 'spot' ||
    transaction.payment_method === DEBIT_CARD ||
    transaction.payment_method === BOLETO
  ) {
    R.forEach(installment => {
      let thisAmount =
        installment === 1 ? firstInstallmentAmount : installmentAmount

      let liquidAmount = Math.round(thisAmount * (1 - mdrFee))

      if (mdr.mdr_type === FLAT) {
        liquidAmount = thisAmount - mdr.mdr_amount
      }

      const installmentMdrFee = thisAmount - liquidAmount
      const fee = installmentMdrFee

      result.push({
        installment,
        installment_amount: thisAmount,
        liquid_amount: liquidAmount,
        fee,
        mdr_fee: installmentMdrFee,
        anticipation_fee: 0
      })
    }, installmentsArray)

    return result
  }

  return Promise.resolve()
    .then(getInstallmentsArray)
    .each(iterateInstallments)
    .then(respond)

  function getInstallmentsArray() {
    return installmentsArray
  }

  function iterateInstallments(installment) {
    let liquidationDate = moment(transaction.captured_at).add(days, 'days')
    let originalLiquidationDate = moment(transaction.captured_at).add(
      30 * installment,
      'days'
    )

    const currentInstallmentAmount =
      installment === 1 ? firstInstallmentAmount : installmentAmount
    const installmentMdrFee = Math.ceil(currentInstallmentAmount * mdrFee)
    const liquidInstallmentAmount = currentInstallmentAmount - installmentMdrFee

    if (anticipationType !== 'per_month') {
      let installmentAnticipationfee
      if (anticipationType === 'per_installment') {
        installmentAnticipationfee = AnticipationFees.perInstallmentAnticipationFee(
          anticipation.fee,
          liquidInstallmentAmount,
          transaction.installments
        )
      }

      if (anticipationType === 'per_additional_installment') {
        installmentAnticipationfee = AnticipationFees.perAdditionalInstallmentAnticipationFee(
          anticipation.fee,
          installmentAmount,
          transaction.installments,
          installment
        )
      }

      const totalFee = installmentMdrFee + installmentAnticipationfee
      const finalInstallmentAmount =
        liquidInstallmentAmount - installmentAnticipationfee

      result.push({
        installment,
        installment_amount: currentInstallmentAmount,
        liquid_amount: finalInstallmentAmount,
        fee: totalFee,
        mdr_fee: installmentMdrFee,
        anticipation_fee: installmentAnticipationfee
      })

      return
    }

    return Promise.resolve()
      .then(getCorrectDate)
      .then(calculateInstallmentValues)

    function getCorrectDate() {
      return getNextBusinessDay(liquidationDate)
    }

    function calculateInstallmentValues(correctDate) {
      liquidationDate = correctDate

      return Promise.resolve()
        .then(getCorrectOriginalLiquidation)
        .then(calculateFinalValues)

      function getCorrectOriginalLiquidation() {
        return getNextBusinessDay(originalLiquidationDate)
      }

      function calculateFinalValues(correctOriginalDate) {
        originalLiquidationDate = correctOriginalDate

        const durationDiff = originalLiquidationDate.diff(
          liquidationDate,
          'days'
        )

        const installmentAnticipationfee = Math.ceil(
          dailyAnticipationfee * durationDiff * liquidInstallmentAmount
        )
        const totalFee = installmentMdrFee + installmentAnticipationfee
        const finalInstallmentAmount =
          liquidInstallmentAmount - installmentAnticipationfee

        result.push({
          installment,
          installment_amount: currentInstallmentAmount,
          liquid_amount: finalInstallmentAmount,
          fee: totalFee,
          mdr_fee: installmentMdrFee,
          anticipation_fee: installmentAnticipationfee
        })

        return
      }
    }
  }

  function respond() {
    return result
  }
}

export function getCostsFromCompanyOrAffiliation(
  transaction,
  company,
  affiliation
) {
  const hasCostsFromAffiliation =
    typeof affiliation.costs === 'object' &&
    R.has('anticipation_cost', affiliation.costs)
  let hasCompanyCosts = typeof company.costs === 'object'
  const costs = {}
  let foundMdr = false
  let priorityFound = 10
  let installmentList = []

  if (hasCostsFromAffiliation) {
    costs.anticipation_cost = affiliation.costs.anticipation_cost || 1.99
  } else if (hasCompanyCosts) {
    costs.anticipation_cost = company.costs.anticipation_fee || 1.99
  } else {
    costs.anticipation_cost = 1.99
  }

  /**
   * Costs from Affiliation should be the standard.
   * If we've found it, we must skip company costs processing
   * and return thee Affiliation-based costs right away.
   */
  if (hasCostsFromAffiliation) {
    const { mdr_amount, mdr_type } = getTransactionPricingByAffiliation(
      transaction,
      affiliation
    )

    Logger.info(
      {
        costs: costs,
        mdr: { mdr_amount, mdr_type },
        affiliation_id: affiliation._id,
        transaction_id: transaction._id,
        transaction_installments: transaction.installments,
        transaction_payment_method: transaction.payment_method,
        split_rules: transaction.split_rules,
        company_id: company._id
      },
      'mdr-to-fetch-costs-from-affiliation'
    )

    costs.mdr = mdr_amount
    costs.mdr_type = mdr_type

    return costs
  }

  Logger.warn(
    { transaction_id: transaction._id, company_id: company._id },
    'company-costs-fallback-used'
  )

  if (hasCompanyCosts && company.costs.mdrs) {
    R.forEach(mdr => {
      if (
        mdr.payment_method === transaction.payment_method &&
        mdr.card_brand === transaction.card.brand
      ) {
        priorityFound = 1
        foundMdr = true
        installmentList = mdr.installments
      } else if (
        mdr.payment_method === transaction.payment_method &&
        mdr.card_brand === 'default'
      ) {
        if (priorityFound > 2) {
          priorityFound = 2
          foundMdr = true
          installmentList = mdr.installments
        }
      } else if (
        mdr.payment_method === 'default' &&
        mdr.card_brand === transaction.card.brand
      ) {
        if (priorityFound > 3) {
          priorityFound = 3
          foundMdr = true
          installmentList = mdr.installments
        }
      } else if (
        mdr.payment_method === 'default' &&
        mdr.card_brand === 'default'
      ) {
        if (priorityFound > 4) {
          priorityFound = 4
          foundMdr = true
          installmentList = mdr.installments
        }
      }
    }, company.costs.mdrs)
  }

  if (hasCompanyCosts && !foundMdr) {
    R.forEach(mdr => {
      if (
        mdr.payment_method === transaction.payment_method &&
        mdr.card_brand === 'mastercard'
      ) {
        priorityFound = 1
        foundMdr = true
        installmentList = mdr.installments
      } else if (
        mdr.payment_method === 'default' &&
        mdr.card_brand === 'mastercard'
      ) {
        if (priorityFound > 3) {
          priorityFound = 3
          foundMdr = true
          installmentList = mdr.installments
        }
      }
    }, company.costs.mdrs)
  }

  if (hasCompanyCosts && !foundMdr) {
    costs.mdr = DEFAULT_CARD_MDR_COST
    costs.mdr_type = 'percentage'
  } else if (hasCompanyCosts) {
    let minimum = 0
    let foundFee = false

    R.forEach(installment => {
      if (installment.installment <= transaction.installments) {
        if (installment.installment > minimum) {
          foundFee = true
          minimum = installment.installment
          costs.mdr = installment.fee
          costs.mdr_type = installment.type
        }
      }
    }, installmentList)

    if (!foundFee) {
      costs.mdr = DEFAULT_CARD_MDR_FEE
      costs.mdr_type = 'percentage'
    }
  }

  return costs
}

export function createSplitWithFeeRule(feeRule, transaction, company) {
  const splitRules = []
  const anticipation = {
    fee: feeRule.anticipation_fee || 2.99,
    type: feeRule.anticipation_type
  }

  let liquidAmount = 0
  let parentAmount = 0

  Logger.info({ feeRule, transaction }, 'creating-split-with-fee-rule')

  const mdr = getTransactionPricingByFeeRule(transaction, feeRule)

  Logger.info(
    {
      mdr,
      fee_rule_id: feeRule._id,
      transaction_id: transaction,
      company_id: company._id
    },
    'mdr-to-create-split-with-fee-rule'
  )

  return Promise.resolve()
    .then(calculateInstallments)
    .then(buildSplitRule)

  function calculateInstallments() {
    return calculateInstallmentsAmounts(transaction, company, mdr, anticipation)
  }

  function buildSplitRule(installments) {
    R.forEach(installment => {
      liquidAmount += installment.liquid_amount
    }, installments)

    parentAmount = transaction.amount - liquidAmount

    // main split rule
    splitRules.push({
      amount: liquidAmount,
      charge_processing_cost: false,
      liable: true,
      company_id: company._id.toString()
    })

    // parent split rule
    splitRules.push({
      amount: parentAmount,
      charge_processing_cost: true,
      liable: false,
      company_id: company.parent_id
    })

    return splitRules
  }
}

export function applyAmountForPercentageSplitRule(transaction, splitRules) {
  const originCompanyId = transaction.company_id
  const transactionAmount = transaction.amount
  let remainingAmount = transactionAmount
  let hasCostOwner = false

  const newSplitRules = splitRules.filter(
    ({ company_id }) => company_id !== originCompanyId
  )

  newSplitRules.map(splitRule => {
    const splitAmount = Math.floor(
      splitRule.percentage / 100 * transactionAmount
    )

    if (splitRule.charge_processing_cost) {
      hasCostOwner = true
    }

    splitRule.amount = splitAmount
    remainingAmount -= splitAmount
    return splitRule
  })

  if (remainingAmount > 0) {
    newSplitRules.push({
      amount: remainingAmount,
      company_id: transaction.company_id,
      charge_processing_cost: !hasCostOwner
    })
  }
  return newSplitRules
}

export function validateSplitRule(locale, transaction, splitRules) {
  Logger.info(
    { provider_transaction_id: transaction.transaction_id },
    'validating-split-rules-for-transaction'
  )

  const totalAmount = transaction.amount
  let splitTotalAmount = 0
  let splitTotalPercentage = 0
  let splitMode = null
  let hasCostOwner = true
  let costOwnerFound = false

  if (!splitRules) {
    Logger.info(
      { provider_transaction_id: transaction.transaction_id },
      'no-split-rules-to-be-validated'
    )

    return
  }

  R.forEach(splitRule => {
    if (!splitMode) {
      if (
        splitRule.amount !== undefined &&
        typeof splitRule.amount === 'number'
      ) {
        splitMode = 'amount'
      } else if (splitRule.percentage !== undefined) {
        splitMode = 'percentage'
      }
    }

    if (splitMode === 'amount' && splitRule.amount === undefined) {
      Logger.error(
        {
          provider_transaction_id: transaction.transaction_id,
          split_rule: splitRule
        },
        'invalid-split-rule-amount-error'
      )
      throw new InvalidSplitRuleAmountError(locale)
    } else if (splitMode === 'amount') {
      splitTotalAmount += splitRule.amount
    }

    if (splitMode === 'percentage' && splitRule.percentage === undefined) {
      Logger.error(
        {
          provider_transaction_id: transaction.transaction_id,
          split_rule: splitRule
        },
        'invalid-split-rule-percentage-error'
      )
      throw new InvalidSplitRulePercentageError(locale)
    } else if (splitMode === 'percentage') {
      splitTotalPercentage += splitRule.percentage
    }

    if (splitRule.charge_processing_cost !== undefined && !costOwnerFound) {
      hasCostOwner = splitRule.charge_processing_cost

      if (splitRule.charge_processing_cost) {
        costOwnerFound = true
      }
    }
  }, splitRules)

  if (splitMode === 'amount' && splitTotalAmount !== totalAmount) {
    Logger.error(
      {
        provider_transaction_id: transaction.transaction_id,
        split_mode: splitMode,
        split_total_amount: splitTotalAmount,
        total_amount: totalAmount
      },
      'invalid-split-rule-amount-error'
    )
    throw new InvalidSplitRuleAmountError(locale)
  }

  if (splitMode === 'percentage' && splitTotalPercentage !== 100) {
    Logger.error(
      {
        provider_transaction_id: transaction.transaction_id,
        split_mode: splitMode,
        split_total_percentage: splitTotalPercentage
      },
      'invalid-split-rule-total-percentage-error'
    )
    throw new InvalidSplitRulePercentageError(locale)
  }

  if (!hasCostOwner) {
    Logger.info(
      { transactionId: transaction.transaction_id },
      'charge-processing-cost-default-to-iso'
    )
  }

  return
}

export function validateDefaultSplitRule(locale, defaultSplitRules, company) {
  let splitTotalPercentage = 0
  const splitMode = 'percentage'

  // Company available just in PUT
  if (
    company !== null &&
    company !== undefined &&
    company.id_str !== undefined &&
    hasCurrentCompanyIdInSplitRules(defaultSplitRules, company.id_str)
  ) {
    throw new InvalidSplitRuleSameCompanyIdError(locale)
  }

  R.forEach(splitRule => {
    if (splitMode === 'percentage' && splitRule.percentage === undefined) {
      throw new InvalidSplitRulePercentageError(locale)
    } else if (splitMode === 'percentage') {
      splitTotalPercentage += splitRule.percentage
    }
  }, defaultSplitRules)

  if (splitMode === 'percentage' && splitTotalPercentage > 100) {
    throw new InvalidSplitRulePercentageError(locale)
  }

  return
}

export function isOnlyGateway({ card }) {
  return !(card && cardBrands.needsPayables(card.brand))
}

export function createPayables(
  transaction,
  company,
  affiliation,
  origin,
  rule
) {
  return Promise.resolve()
    .then(createBasePayable)
    .then(calculatePaymentDates)
    .then(calculateCosts)
    .then(savePayables)
    .then(respond)

  function createBasePayable() {
    const installmentsArray = []
    const installmentAmount = Math.floor(
      transaction.amount / transaction.installments
    )
    const firstInstallmentAmount =
      transaction.amount - (transaction.installments - 1) * installmentAmount
    const initialPayables = []

    for (let i = 1; i <= transaction.installments; i += 1) {
      installmentsArray.push(i)
    }

    if (!R.has('split_rules', transaction.toObject())) {
      // TODO create payables when there is no split rule
      return []
    } else if (origin === 'transaction') {
      R.forEach(splitRule => {
        const payableInstallmentAmount = Math.floor(
          splitRule.amount / transaction.installments
        )
        const payableFirstInstallmentAmount =
          splitRule.amount -
          (transaction.installments - 1) * payableInstallmentAmount

        R.forEach(installment => {
          const buildingPayable = {
            provider: transaction.provider,
            affiliation_id: splitRule.affiliation_id,
            mcc: transaction.mcc,
            origin_affiliation_id: transaction.affiliation_id,
            transaction_id: transaction._id,
            provider_transaction_id: transaction.provider_transaction_id,
            transaction_nsu: transaction.nsu,
            transaction_amount: transaction.amount,
            status: 'waiting_funds',
            capture_method: transaction.capture_method,
            split_rule_id: splitRule.id,
            total_installments: transaction.installments,
            installment,
            payment_method: transaction.payment_method,
            transaction_captured_at: moment(transaction.captured_at).format(
              'YYYY-MM-DD'
            ),
            type: 'credit',
            origin_company_id: transaction.company_id,
            owner_company_id: splitRule.company_id,
            company_id: splitRule.company_id,
            fee: 0,
            mdr_fee: 0,
            anticipation_fee: 0,
            cost: 0,
            mdr_cost: 0,
            anticipation_cost: 0,
            processed: splitRule.company_id === transaction.company_id
          }

          const transactionCardBrand =
            transaction.card && transaction.card.brand
              ? transaction.card.brand
              : transaction.card_brand

          if (transactionCardBrand) {
            buildingPayable.card_brand = transactionCardBrand
          }

          if (splitRule.company_id === transaction.company_id) {
            buildingPayable.amount =
              installment === 1 ? firstInstallmentAmount : installmentAmount
            buildingPayable.fee =
              installment === 1
                ? firstInstallmentAmount - payableFirstInstallmentAmount
                : installmentAmount - payableInstallmentAmount
          } else {
            buildingPayable.amount =
              installment === 1
                ? payableFirstInstallmentAmount
                : payableInstallmentAmount
          }

          initialPayables.push(buildingPayable)
        }, installmentsArray)
      }, transaction.split_rules)

      return initialPayables
    }

    const anticipation = {
      fee: rule.anticipation_fee || 2.99,
      type: rule.anticipation_type
    }

    const mdr = getTransactionPricingByFeeRule(transaction, rule)

    Logger.info(
      {
        mdr,
        fee_rule: rule,
        transaction_id: transaction._id,
        transaction_installments: transaction.installments,
        transaction_payment_method: transaction.payment_method,
        split_rules: transaction.split_rules,
        company_id: company._id
      },
      'mdr-to-create-payables'
    )

    return Promise.resolve()
      .then(calculateInstallments)
      .then(buildPayables)

    function calculateInstallments() {
      return calculateInstallmentsAmounts(
        transaction,
        company,
        mdr,
        anticipation
      )
    }

    function buildPayables(installments) {
      R.forEach(splitRule => {
        const payableInstallmentAmount = Math.floor(
          splitRule.amount / transaction.installments
        )
        const payableFirstInstallmentAmount =
          splitRule.amount -
          (transaction.installments - 1) * payableInstallmentAmount

        R.forEach(installment => {
          let currentInstallment = null

          R.forEach(instaAmount => {
            if (instaAmount.installment === installment) {
              currentInstallment = instaAmount
            }
          }, installments)

          const buildingPayable = {
            provider: transaction.provider,
            affiliation_id: splitRule.affiliation_id,
            mcc: transaction.mcc,
            origin_affiliation_id: transaction.affiliation_id,
            transaction_id: transaction._id,
            transaction_nsu: transaction.nsu,
            transaction_amount: transaction.amount,
            status: 'waiting_funds',
            capture_method: transaction.capture_method,
            provider_transaction_id: transaction.provider_transaction_id,
            split_rule_id: splitRule.id,
            total_installments: transaction.installments,
            installment,
            payment_method: transaction.payment_method,
            transaction_captured_at: moment(transaction.captured_at).format(
              'YYYY-MM-DD'
            ),
            card_brand: transaction.card.brand,
            type: 'credit',
            origin_company_id: transaction.company_id,
            owner_company_id: splitRule.company_id,
            company_id: splitRule.company_id,
            fee: 0,
            mdr_fee: 0,
            anticipation_fee: 0,
            cost: 0,
            mdr_cost: 0,
            anticipation_cost: 0,
            processed: splitRule.company_id === transaction.company_id
          }

          if (origin === 'hybrid') {
            if (splitRule.company_id === transaction.company_id) {
              buildingPayable.amount =
                installment === 1 ? firstInstallmentAmount : installmentAmount
              buildingPayable.fee =
                installment === 1
                  ? firstInstallmentAmount - payableFirstInstallmentAmount
                  : installmentAmount - payableInstallmentAmount

              // buildingPayable.amount -= currentInstallment.fee
              buildingPayable.fee += currentInstallment.fee
              buildingPayable.mdr_fee = currentInstallment.mdr_fee
              buildingPayable.anticipation_fee =
                currentInstallment.anticipation_fee
            } else {
              buildingPayable.amount =
                installment === 1
                  ? payableFirstInstallmentAmount
                  : payableInstallmentAmount

              if (splitRule.company_id === company.parent_id) {
                buildingPayable.amount += currentInstallment.fee
                buildingPayable.mdr_amount = currentInstallment.mdr_fee
                buildingPayable.anticipation_amount =
                  currentInstallment.anticipation_fee
              }
            }
          } else {
            if (splitRule.company_id === transaction.company_id) {
              buildingPayable.amount = currentInstallment.installment_amount
              buildingPayable.fee = currentInstallment.fee
              buildingPayable.mdr_fee = currentInstallment.mdr_fee
              buildingPayable.anticipation_fee =
                currentInstallment.anticipation_fee
            } else {
              buildingPayable.amount = currentInstallment.fee
              buildingPayable.mdr_amount = currentInstallment.mdr_fee
              buildingPayable.anticipation_amount =
                currentInstallment.anticipation_fee
            }
          }

          initialPayables.push(buildingPayable)
        }, installmentsArray)
      }, transaction.split_rules)

      return initialPayables
    }
  }

  function calculatePaymentDates(payables) {
    const updatedPayables = []

    return Promise.resolve()
      .then(getPayables)
      .each(calculatePaymentDate)
      .then(respond)

    function getPayables() {
      return payables
    }

    function calculatePaymentDate(payable) {
      const updatedPayable = payable

      return Promise.resolve()
        .then(getOriginalLiquidationDate)
        .spread(getNextBusinessLiquidationDay)
        .spread(updateArray)

      function getOriginalLiquidationDate() {
        let liquidationDate = null
        let originalLiquidationDate = null

        if (
          payable.payment_method === DEBIT_CARD ||
          payable.payment_method === BOLETO
        ) {
          liquidationDate = moment(payable.transaction_captured_at).add(
            1,
            'days'
          )
          originalLiquidationDate = liquidationDate
          payable.anticipatable = false
        } else if (company.anticipation_type === 'automatic') {
          const Days = company.anticipation_days_interval || 1
          liquidationDate = moment(payable.transaction_captured_at).add(
            Days,
            'days'
          )

          originalLiquidationDate = moment(payable.transaction_captured_at).add(
            30 * payable.installment,
            'days'
          )
        } else {
          liquidationDate = moment(payable.transaction_captured_at).add(
            30 * payable.installment,
            'days'
          )
          originalLiquidationDate = liquidationDate
        }

        return [liquidationDate, originalLiquidationDate]
      }

      function getNextBusinessLiquidationDay(date, originalDate) {
        return [getNextBusinessDay(date), getNextBusinessDay(originalDate)]
      }

      function updateArray(correctDate, correctedOriginalDate) {
        updatedPayable.payment_date = correctDate.format('YYYY-MM-DD')

        if (!correctDate.isSame(correctedOriginalDate, 'day')) {
          updatedPayable.original_payment_date = correctedOriginalDate.format(
            'YYYY-MM-DD'
          )

          updatedPayable.anticipated = true
        }

        updatedPayables.push(updatedPayable)

        return
      }
    }

    function respond() {
      return updatedPayables
    }
  }

  function calculateCosts(payables) {
    if (payables.length === 0) {
      return []
    }

    const costs = getCostsFromCompanyOrAffiliation(
      transaction,
      company,
      affiliation
    )
    const installmentAmount = Math.floor(
      transaction.amount / transaction.installments
    )
    const firstInstallmentAmount =
      transaction.amount - (transaction.installments - 1) * installmentAmount
    const costsByInstallment = {}
    const installmentsArray = []

    for (let i = 1; i <= transaction.installments; i += 1) {
      installmentsArray.push(i)
    }

    return Promise.resolve()
      .then(getInstallmentsArray)
      .each(calculateInstallmentCost)
      .then(finishPayableCalculation)

    function getInstallmentsArray() {
      return installmentsArray
    }

    function calculateInstallmentCost(installment) {
      let liquidAmount = 0
      let mdrCost = 0

      if (costs.mdr_type === PERCENTAGE) {
        if (
          company.anticipation_type === 'spot' ||
          transaction.payment_method === DEBIT_CARD ||
          transaction.payment_method === BOLETO
        ) {
          if (installment === 1) {
            liquidAmount = Math.ceil(
              firstInstallmentAmount * (1 - costs.mdr / 100)
            )
            mdrCost = firstInstallmentAmount - liquidAmount
          } else {
            liquidAmount = Math.ceil(installmentAmount * (1 - costs.mdr / 100))
            mdrCost = installmentAmount - liquidAmount
          }
        } else {
          if (installment === 1) {
            liquidAmount = Math.floor(
              firstInstallmentAmount * (1 - costs.mdr / 100)
            )
            mdrCost = firstInstallmentAmount - liquidAmount
          } else {
            liquidAmount = Math.floor(installmentAmount * (1 - costs.mdr / 100))
            mdrCost = installmentAmount - liquidAmount
          }
        }
      } else if (installment === 1) {
        liquidAmount = firstInstallmentAmount - costs.mdr
        mdrCost = firstInstallmentAmount - liquidAmount
      } else {
        liquidAmount = installmentAmount - costs.mdr
        mdrCost = installmentAmount - liquidAmount
      }

      costsByInstallment[installment] = {
        mdr_cost: mdrCost,
        anticipation_cost: 0,
        cost: mdrCost
      }

      if (
        company.anticipation_type === 'spot' ||
        transaction.payment_method === DEBIT_CARD ||
        transaction.payment_method === BOLETO
      ) {
        return
      }

      const days = company.anticipation_days_interval || 1
      let liquidationDate = moment(transaction.captured_at).add(days, 'days')
      let originalLiquidationDate = moment(transaction.captured_at).add(
        30 * installment,
        'days'
      )

      return Promise.resolve()
        .then(getLiquidationDate)
        .then(getOriginalLiquidationDate)
        .spread(calculateAnticipationCost)

      function getLiquidationDate() {
        return getNextBusinessDay(liquidationDate)
      }

      function getOriginalLiquidationDate(correctedDate) {
        return [correctedDate, getNextBusinessDay(originalLiquidationDate)]
      }

      function calculateAnticipationCost(correctedDate, originalCorrected) {
        liquidationDate = correctedDate
        originalLiquidationDate = originalCorrected

        const durationDiff = originalLiquidationDate.diff(
          liquidationDate,
          'days'
        )
        const dailyfee = costs.anticipation_cost / 100 / 30
        let anticipationCost = 0

        if (installment === 1) {
          anticipationCost = Math.ceil(
            dailyfee *
              durationDiff *
              (firstInstallmentAmount -
                costsByInstallment[installment].mdr_cost)
          )
        } else {
          anticipationCost = Math.ceil(
            dailyfee *
              durationDiff *
              (installmentAmount - costsByInstallment[installment].mdr_cost)
          )
        }

        costsByInstallment[installment].anticipation_cost = anticipationCost
        costsByInstallment[installment].cost += anticipationCost

        return
      }
    }

    function finishPayableCalculation() {
      let costOwner = false
      const updatedPayables = []

      if (R.has('split_rules', transaction.toObject())) {
        R.forEach(splitRule => {
          if (splitRule.charge_processing_cost) {
            costOwner = splitRule.company_id
          }
        }, transaction.split_rules)
      } else {
        costOwner = transaction.company_id
      }

      R.forEach(payable => {
        const newPayable = payable

        if (payable.company_id === costOwner) {
          newPayable.cost = costsByInstallment[payable.installment].cost
          newPayable.mdr_cost = costsByInstallment[payable.installment].mdr_cost
          newPayable.anticipation_cost =
            costsByInstallment[payable.installment].anticipation_cost
        }

        updatedPayables.push(newPayable)
      }, payables)

      return updatedPayables
    }
  }

  function savePayables(payables) {
    const dbPayables = []

    return Promise.resolve()
      .then(getPayables)
      .each(createPayable)
      .then(respond)

    function getPayables() {
      return payables
    }

    function createPayable(payable) {
      return Promise.resolve()
        .then(createOnDatabase)
        .then(finish)

      function createOnDatabase() {
        return Payable.create(payable)
      }

      function finish(dbPayable) {
        dbPayables.push(dbPayable)
      }
    }

    function respond() {
      return dbPayables
    }
  }

  function respond(payables) {
    Logger.info(`
      Payables created successfully for transaction ${transaction._id}
    `)

    return payables
  }
}

export function parseHammerData(hammerBase64Data) {
  const hammerData = JSON.parse(decodeBase64(hammerBase64Data))

  const parsePaymentMethod = paymentMethod => {
    switch (paymentMethod) {
      case 'credit':
        return CREDIT_CARD
      case 'debit':
        return DEBIT_CARD
      case 'bank-slip':
        return BOLETO
      case 'money':
        return MONEY
    }
  }

  const parseCaptureMethod = captureMethod => {
    switch (captureMethod) {
      case 'emv':
        return EMV
      case 'magnetic-stripe':
      case 'magnetic-fallback':
        return MAGSTRIPE
      case 'e-commerce':
        return ECOMMERCE
    }
  }

  const parseStatus = status => {
    switch (status) {
      case 'confirmed':
        return PAID
      case 'denied_issuer':
      case 'denied_terminal':
        return REFUSED
    }
  }

  const parseAcquirerId = acquirer_id => {
    switch (acquirer_id) {
      case 'pagseguro':
        return 'pags'

      default:
        return acquirer_id
    }
  }

  const transactionPayload = {
    provider: 'hash',
    amount: hammerData.amount,
    installments: hammerData.installments,
    company_id: hammerData.merchant_hash_id,
    transaction_id: hammerData.id,
    hardware_id: hammerData.terminal_hash_id,
    serial_number: hammerData.serial_number,
    captured_at: moment(hammerData.created_at).format(),
    acquirer_created_at: moment(hammerData.created_at).format(),
    acquirer_name: parseAcquirerId(hammerData.acquirer_id),
    nsu: hammerData.nsu,
    capture_method: parseCaptureMethod(hammerData.capture_method),
    payment_method: parsePaymentMethod(hammerData.payment_method),
    status: parseStatus(hammerData.status),
    card_first_digits: hammerData.card_first_digits,
    card_last_digits: hammerData.card_last_digits,
    card_holder_name: hammerData.cardholder_name,
    card_brand: hammerData.card_brand,
    acquirer_response_code: hammerData.issuer_response_code
  }

  return {
    hammerData: hammerData,
    transactionData: R.reject(R.isNil, transactionPayload)
  }
}

export function parseTransactionEventData(cloudEvent) {
  const data = cloudEvent.data

  const serialNumber = data.deprecated_do_not_use
    ? decodeBase64(data.deprecated_do_not_use.do_not_use_1)
    : null
  const cardBrand = data.deprecated_do_not_use
    ? decodeBase64(data.deprecated_do_not_use.do_not_use_2)
    : null
  const nsu = data.deprecated_do_not_use
    ? decodeBase64(data.deprecated_do_not_use.do_not_use_3)
    : null
  const cardholderName = data.cardholderData.cardholderName
    ? data.cardholderData.cardholderName
    : ''
  const capturedBy = data.captureChannelData
    ? data.captureChannelData.name
    : 'hash'

  // Parse capture method
  const parseCaptureMethod = captureMethod => {
    switch (captureMethod) {
      case 'icc':
        return EMV
      case 'magnetic-stripe':
      case 'fallback-magnetic-stripe':
        return MAGSTRIPE
      case 'contactless-icc':
        return CONTACTLESS_ICC
    }
  }

  // Parse payment method
  const parsePaymentMethod = paymentMethod => {
    switch (paymentMethod) {
      case 'credit':
        return CREDIT_CARD
      case 'debit':
        return DEBIT_CARD
    }
  }

  // Parse acquirer id
  const parseAcquirerId = acquirer_id => {
    switch (acquirer_id) {
      case 'pagseguro':
        return 'pags'
      default:
        return acquirer_id
    }
  }

  const transactionParams = {
    provider: 'hash',
    amount: data.amount,
    installments: data.installmentTransactionData
      ? data.installmentTransactionData.installmentCount
      : 1,
    company_id: data.merchantID,
    transaction_id: data.id,
    hardware_id: data.terminalID,
    serial_number: serialNumber,
    captured_at: moment(data.authorizerData.dateTime).format(),
    acquirer_created_at: moment(data.authorizerData.dateTime).format(),
    acquirer_name: parseAcquirerId(data.authorizerData.name),
    nsu: nsu,
    capture_method: parseCaptureMethod(data.entryMode),
    payment_method: parsePaymentMethod(data.accountType),
    status: data.approved ? PAID : REFUSED,
    card_first_digits: data.cardholderData.panFirstDigits,
    card_last_digits: data.cardholderData.panLastDigits,
    card_holder_name: cardholderName,
    card_brand: cardBrand,
    acquirer_response_code: data.authorizerData.responseCode,
    captured_by: capturedBy,
    metadata: {
      acquirer_name: data.authorizerData.name,
      acquirer_transaction_id: data.authorizerData.uniqueID
        ? data.authorizerData.uniqueID
        : null
    }
  }

  // Special treatment for sales-links transactions
  if (capturedBy === 'hash-payment-link') {
    // Electronic transactions have no nsu/serial_number
    transactionParams.nsu = null
    transactionParams.serial_number = null

    const paymentLinkData = data.captureChannelData.paymentLinkData
    transactionParams.antifraud_assessment_id =
      paymentLinkData.antifraudAssessmentId
    transactionParams.capture_method = ECOMMERCE
    transactionParams.acquirer_account_id =
      data.authorizerData.specificData.affiliationID
    transactionParams.consumer = {
      ip: paymentLinkData.consumer.ip,
      tracking_id: paymentLinkData.consumer.trackingID,
      full_name: paymentLinkData.consumer.fullName,
      email: paymentLinkData.consumer.email,
      document_type: paymentLinkData.consumer.documentType,
      document_number: paymentLinkData.consumer.documentNumber,
      phone: paymentLinkData.consumer.phone,
      date_of_birth: paymentLinkData.consumer.dateOfBirth,
      address: {
        zipcode: paymentLinkData.consumer.address.zipcode,
        street: paymentLinkData.consumer.address.street,
        street_number: paymentLinkData.consumer.address.streetNumber,
        neighborhood: paymentLinkData.consumer.address.neighborhood,
        state: paymentLinkData.consumer.address.state,
        city: paymentLinkData.consumer.address.city
      }
    }
    transactionParams.metadata['sales_link_id'] =
      paymentLinkData.metadata.salesLinkID
    transactionParams.metadata['sales_link_tracking_id'] =
      paymentLinkData.metadata.salesLinkTrackingID
    transactionParams.metadata['sales_link_transaction_request_id'] =
      paymentLinkData.metadata.salesLinkTransactionRequestID
    transactionParams.metadata['short_id'] = paymentLinkData.metadata.shortID
    if (paymentLinkData.splitRules) {
      transactionParams.split_rules = paymentLinkData.splitRules.map(rule => {
        return {
          company_id: rule.companyID,
          amount: rule.amount,
          charge_processing_cost: rule.chargeProcessingCost
        }
      })
    }
    if (paymentLinkData.statusReason) {
      transactionParams.status_reason = paymentLinkData.statusReason
    }
    transactionParams.captured_by_hash = true
  }

  return transactionParams
}
