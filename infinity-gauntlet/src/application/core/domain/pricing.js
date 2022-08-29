import jjv from 'jjv'
import { BOLETO, CREDIT_CARD, DEBIT_CARD } from './methods'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'PRICING_DOMAIN' })

/**
 * We are setting default MDR if any cost or fee is not found where it should be configured,
 * if a default value is applied we will be automatically alerted with logging defined in
 * the applyDefaultMdr() function with the message: using-default-mdr
 *
 * DEFAULT_CARD_MDR_COST - if is not found card brand cost defined in affiliation
 * DEFAULT_CARD_MDR_FEE - if is not found card brand fee defined in fee_rule
 * DEFAULT_BOLETO_MDR_COST - if is not found boleto pricing cost defined in affiliation
 * DEFAULT_BOLETO_MDR_FEE - if is not found boleto pricing fee defined in fee_rule
 */

// 09-03-22: Updated upon suggestion from BizDev team
export const DEFAULT_CARD_MDR_COST = 3
export const DEFAULT_CARD_MDR_FEE = 3

const DEFAULT_BOLETO_MDR_COST = 300
const DEFAULT_BOLETO_MDR_FEE = 400

/**
 * To reduce errors in the release of the product sales link, we are add a default value for the
 * boleto charges, as all merchants are created with the same value (R$ 3,00) through a manual flow of support, we decided
 * to automate this default value by decreasing tickets in support and leaving more easy to adopt the sales link.
 *
 * Read more about this problem in: https://hashlab.slack.com/archives/CP69210VD/p1615226222011600
 */
const DEFAULT_BOLETO_PRICING_AMOUNT = 300

export const CardPricing = {
  debit: {
    type: Number
  },
  credit_1: {
    type: Number
  },
  credit_2: {
    type: Number
  },
  credit_7: {
    type: Number
  }
}
/**
 * A "FLAT" represents a fixed Real(R$) amount.
 * Contracts that specify flat dollar amounts rather than percentage-based
 * fees remove the size of the transaction from the fee equation.
 * @type {string}
 */
export const FLAT = 'flat'

/**
 * Percentage-based - transactions values will be processed based in percentage of amount
 * @type {string}
 */
export const PERCENTAGE = 'percentage'
const amountTypeEnum = [FLAT, PERCENTAGE]

export const BoletoPricing = {
  amount: {
    type: Number,
    default: DEFAULT_BOLETO_PRICING_AMOUNT
  },
  amount_type: {
    type: String,
    enum: amountTypeEnum,
    default: FLAT
  }
}

/**
 * @param {Pricing} pricing
 * @return {{credit_7: Number, credit_2: Number, debit: Number, credit_1: Number, boleto: Number=}}
 */
export const cardPricingResponder = ({
  debit,
  credit_1,
  credit_2,
  credit_7
}) => ({
  debit: debit,
  credit_1: credit_1,
  credit_2: credit_2,
  credit_7: credit_7
})

/**
 * Check if boletoPricing exists
 * @param boletoPricing
 * @return {boolean}
 */
export const hasBoletoPricing = boletoPricing => {
  const validator = jjv()
  validator.addSchema('boletoPricing', {
    type: 'object',
    properties: {
      amount: {
        type: 'number'
      },
      amount_type: {
        type: 'string',
        enum: amountTypeEnum,
        default: FLAT
      }
    },
    required: ['amount', 'amount_type']
  })

  const err = validator.validate('boletoPricing', boletoPricing)
  return !err
}

/**
 * Based on payment_method and number of installments this function will pick fit price to specific transaction
 * @param {CardPricing} brandPrices
 * @param {Transaction} transaction
 * @return {Number}
 */
export const getBrandPrice = (brandPrices, transaction) => {
  if (transaction.payment_method === DEBIT_CARD) {
    return brandPrices.debit
  }
  if (transaction.payment_method === CREDIT_CARD) {
    if (transaction.installments === 1) {
      return brandPrices.credit_1
    }
    if (transaction.installments > 6) {
      return brandPrices.credit_7
    }
    return brandPrices.credit_2
  }
  return null
}

export function getFallbackBrand(brands) {
  const findBrand = (brands, name) => brands.find(({ brand }) => brand === name)

  const eloBrand = findBrand(brands, 'elo')

  if (eloBrand) {
    return eloBrand
  }

  const masterCardBrand = findBrand(brands, 'mastercard')

  if (masterCardBrand) {
    return masterCardBrand
  }

  const visaBrand = findBrand(brands, 'visa')

  if (visaBrand) {
    return visaBrand
  }

  // If we can't find any of the fallbacks, we use any of the brands available
  if (brands.length > 0) {
    return brands[0]
  }

  throw Error('No other brands to fallback to.')
}

/**
 * @typedef Mdr
 * @type {object}
 * @property {Number} mdr_amount - amount of mdr defined in affiliation or FeeRule.
 * @property {String} mdr_type - type of price(FLAT or PERCENTAGE)
 */

/**
 *  return mdr prices of transaction based on FeeRule
 * @param {Transaction} transaction
 * @param {FeeRule} feeRule
 * @return Mdr
 */
export const getTransactionPricingByFeeRule = (transaction, feeRule) => {
  if (transaction.payment_method === BOLETO) {
    if (
      !('boleto_pricing' in feeRule) ||
      !hasBoletoPricing(feeRule.boleto_pricing)
    ) {
      return applyDefaultMdr({
        transaction,
        mdr_amount: DEFAULT_BOLETO_MDR_FEE,
        mdr_type: FLAT,
        fee_rule: feeRule
      })
    }

    const { amount, amount_type } = feeRule.boleto_pricing
    return {
      mdr_amount: amount,
      mdr_type: amount_type
    }
  }

  // The case of no fees being define must fail loudly
  if (!('brands' in feeRule) || feeRule.brands.length <= 0) {
    Logger.warn(
      { feeRule, transactionId: transaction._id },
      'no-brands-in-fee-rules'
    )

    return applyDefaultMdr({
      transaction,
      mdr_amount: DEFAULT_CARD_MDR_FEE,
      mdr_type: PERCENTAGE,
      fee_rule: feeRule
    })
  }

  /**
   * card brand can be configured in card_brand(in params to register transaction) or
   * in card.brand(after create transaction)
   */
  const transactionCardBrand =
    transaction.card && transaction.card.brand
      ? transaction.card.brand
      : transaction.card_brand

  const brand = feeRule.brands.find(
    ({ brand }) => brand === transactionCardBrand
  )

  let amount
  // If we can't find the right brand, we will fallback to other options
  if (!brand) {
    const fallbackBrand = getFallbackBrand(feeRule.brands)
    amount = getBrandPrice(fallbackBrand.fee, transaction)

    Logger.info(
      {
        original: transactionCardBrand,
        fallback: fallbackBrand.brand,
        transactionId: transaction._id
      },
      'pricing-using-fallback-brand'
    )
  } else {
    amount = getBrandPrice(brand.fee, transaction)
  }

  if (isNaN(amount)) {
    Logger.warn({ feeRule }, 'fee-rule-amount-is-not-a-number')

    return applyDefaultMdr({
      transaction,
      mdr_amount: DEFAULT_CARD_MDR_FEE,
      mdr_type: PERCENTAGE,
      fee_rule: feeRule
    })
  }
  return {
    mdr_amount: amount,
    mdr_type: PERCENTAGE
  }
}

/**
 * Apply default mdr amount and type; and logging infos about this mdr
 * @param mdr_amount
 * @param mdr_type
 * @param transaction
 * @param affiliation
 * @param fee_rule
 * @param brand
 * @return Mdr
 */
function applyDefaultMdr({
  mdr_amount,
  mdr_type,
  transaction,
  affiliation = {},
  fee_rule = {}
}) {
  Logger.warn(
    {
      mdr_amount,
      mdr_type,
      transaction,
      affiliation,
      fee_rule
    },
    'using-default-mdr'
  )
  return { mdr_amount, mdr_type }
}

/**
 * return mdr prices of transaction based on affiliation
 * @param {Transaction} transaction
 * @param {Affiliation} affiliation
 * @return Mdr
 */
export const getTransactionPricingByAffiliation = (
  transaction,
  affiliation
) => {
  if (transaction.payment_method === BOLETO) {
    if (
      !('boleto_pricing' in affiliation.costs) ||
      !hasBoletoPricing(affiliation.costs.boleto_pricing)
    ) {
      return applyDefaultMdr({
        transaction,
        mdr_amount: DEFAULT_BOLETO_MDR_COST,
        mdr_type: FLAT,
        affiliation
      })
    }
    const { amount, amount_type } = affiliation.costs.boleto_pricing
    return {
      mdr_amount: amount,
      mdr_type: amount_type
    }
  }
  if (
    !('costs' in affiliation) ||
    !('brands' in affiliation.costs) ||
    affiliation.costs.brands.length <= 0
  ) {
    return applyDefaultMdr({
      transaction,
      affiliation,
      mdr_amount: DEFAULT_CARD_MDR_COST,
      mdr_type: PERCENTAGE
    })
  }

  /**
   * card brand can be configured in card_brand(in params to register transaction) or
   * in card.brand(after create transaction)
   */
  const transactionCardBrand =
    transaction.card && transaction.card.brand
      ? transaction.card.brand
      : transaction.card_brand

  const brand = affiliation.costs.brands.find(
    brand => brand.brand === transactionCardBrand
  )

  let amount
  if (!brand) {
    const fallbackBrand = getFallbackBrand(affiliation.costs.brands)
    amount = getBrandPrice(fallbackBrand.cost, transaction)

    Logger.info(
      {
        original: transactionCardBrand,
        fallback: fallbackBrand.brand,
        transactionId: transaction._id
      },
      'pricing-using-fallback-brand'
    )
  } else {
    amount = getBrandPrice(brand.cost, transaction)
  }

  // If by any change the calculation went wrong, we use the default
  if (isNaN(amount)) {
    Logger.warn(
      { affiliation: affiliation._id },
      'affiliation-cost-amount-is-not-a-number'
    )

    return applyDefaultMdr({
      mdr_amount: DEFAULT_CARD_MDR_COST,
      mdr_type: PERCENTAGE,
      affiliation: affiliation
    })
  }
  return {
    mdr_amount: amount,
    mdr_type: PERCENTAGE
  }
}
