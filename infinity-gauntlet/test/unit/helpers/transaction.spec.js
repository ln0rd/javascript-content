import { expect } from 'chai'
import forEach from 'mocha-each'
import {
  creditTransaction,
  debitTransaction,
  boletoTransaction,
  visaTransaction,
  weirdAmountTransaction,
  vrTransaction
} from 'test/mocks/transaction'
import {
  companyWithAutomaticAnticipation,
  companyWithCosts,
  companyWithCostsAndNoMdr,
  companyWithoutCosts,
  companyWithSpotAnticipation,
  companyWithDefaultSplitRules
} from 'test/mocks/company'
import {
  calculateInstallmentsAmounts,
  createSplitWithFeeRule,
  getCardBrand,
  normatizeCardBrand,
  getCostsFromCompanyOrAffiliation,
  isOnlyGateway,
  validateSplitRule,
  validateDefaultSplitRule,
  applyAmountForPercentageSplitRule,
  parseHammerData,
  parseTransactionEventData
} from 'application/core/helpers/transaction'
import {
  anticipationPerInstallment,
  anticipationPerMonth
} from 'test/mocks/anticipation'
import {
  affiliationWithCosts,
  affiliationWithCostsAndNoBrands,
  affiliationWithoutCosts
} from 'test/mocks/affiliation'
import { generateAffiliation } from 'test/fixtures'
import {
  feeRule,
  feeRuleWithNoBrands,
  feeRuleWithBoletoPricingBasedOnPercentage
} from 'test/mocks/fee-rule'
import {
  splitRuleAmount,
  splitRulePercentage,
  splitRulesAmountNotOk,
  splitRulesOnlyAmount,
  splitRulesOnlyPercentage,
  splitRulesPercentageNotOk
} from 'test/mocks/split-rule'
import InvalidSplitRuleAmountError from 'application/core/errors/invalid-split-rule-amount-error'
import InvalidSplitRulePercentageError from 'application/core/errors/invalid-split-rule-percentage-error'
import InvalidSplitRuleSameCompanyIdError from 'application/core/errors/invalid-split-rule-same-company-id-error'
import {
  EMV,
  MAGSTRIPE,
  ECOMMERCE,
  CREDIT_CARD,
  DEBIT_CARD,
  BOLETO,
  MONEY
} from 'application/core/domain/methods'
import { PAID, REFUSED } from 'application/core/models/transaction'
import {
  PERCENTAGE,
  FLAT,
  DEFAULT_CARD_MDR_COST
} from 'application/core/domain/pricing'
import moment from 'moment'

describe('Unit => Helpers: Transaction', () => {
  context('getCardBrand', () => {
    it('should be unknown when the card number is invalid', () => {
      const brand = getCardBrand('11111111111')
      expect(brand).to.equal('unknown')
    })
    it('should be elo when the card number starts in range 506699 to 506778', () => {
      const brand = getCardBrand('50670000000')
      expect(brand).to.equal('elo')
    })
  })

  context('normatizeCardBrand', () => {
    const tests = [
      { cardBrand: 'mastercard', expectedCardBrand: 'mastercard' },
      { cardBrand: 'maestro', expectedCardBrand: 'mastercard' },
      { cardBrand: 'credito pan', expectedCardBrand: 'mastercard' },
      { cardBrand: 'dnb mastercard', expectedCardBrand: 'mastercard' },
      { cardBrand: 'aura', expectedCardBrand: 'mastercard' },
      { cardBrand: 'discover', expectedCardBrand: 'mastercard' },
      { cardBrand: 'unknown', expectedCardBrand: 'mastercard' },
      { cardBrand: 'visa', expectedCardBrand: 'visa' },
      { cardBrand: 'visa electron', expectedCardBrand: 'visa' },
      { cardBrand: 'visaelectron', expectedCardBrand: 'visa' },
      { cardBrand: 'visacredito', expectedCardBrand: 'visa' },
      { cardBrand: 'visa credito', expectedCardBrand: 'visa' },
      { cardBrand: 'tae', expectedCardBrand: 'ticket' },
      { cardBrand: 'ref', expectedCardBrand: 'ticket' },
      { cardBrand: 'ticket restaurante', expectedCardBrand: 'ticket' },
      { cardBrand: 'hipercard', expectedCardBrand: 'hiper' },
      { cardBrand: 'sodexo pass refeicao', expectedCardBrand: 'sodexo' },
      { cardBrand: 'alelo refeicao', expectedCardBrand: 'alelo' },
      { cardBrand: 'elo credito', expectedCardBrand: 'elo' },
      { cardBrand: 'elo debito', expectedCardBrand: 'elo' },
      { cardBrand: 'cabal credito', expectedCardBrand: 'cabal' },
      { cardBrand: 'cabal debito', expectedCardBrand: 'cabal' },
      { cardBrand: 'volus credito', expectedCardBrand: 'volus' },
      { cardBrand: 'up credito', expectedCardBrand: 'upbrasil' }
    ]

    tests.forEach(test => {
      it(
        'should be ' +
          test.expectedCardBrand +
          ' when the card brand is ' +
          test.cardBrand,
        () => {
          const cardBrand = normatizeCardBrand(test.cardBrand)
          expect(cardBrand).to.equal(test.expectedCardBrand)
        }
      )
      it(
        'should be ' +
          test.expectedCardBrand +
          ' when the card brand is ' +
          test.cardBrand.toUpperCase(),
        () => {
          const cardBrand = normatizeCardBrand(test.cardBrand)
          expect(cardBrand).to.equal(test.expectedCardBrand)
        }
      )
    })

    const nonStringTests = [
      { cardBrand: null, expectedCardBrand: null },
      { cardBrand: undefined, expectedCardBrand: undefined },
      { cardBrand: 42, expectedCardBrand: 42 }
    ]

    nonStringTests.forEach(test => {
      const testCardBrand = test.cardBrand
      it(`should be ${testCardBrand} when the card brand is ${testCardBrand}`, () => {
        const cardBrand = normatizeCardBrand(test.cardBrand)
        expect(cardBrand).to.equal(test.expectedCardBrand)
      })
    })
  })

  context('isOnlyGateway', () => {
    it('should be gateway only when there is no card in the transaction', () => {
      const transaction = {}
      const isGateway = isOnlyGateway(transaction)
      expect(isGateway).to.equal(true)
    })

    it('should be gateway only when there the card brand in the transaction is vr', () => {
      const transaction = vrTransaction()
      const isGateway = isOnlyGateway(transaction)
      expect(isGateway).to.equal(true)
    })

    it('should not be gateway only when there the card brand in the transaction is visa', () => {
      const transaction = visaTransaction()
      const isGateway = isOnlyGateway(transaction)
      expect(isGateway).to.equal(false)
    })
  })

  context('calculateInstallmentsAmounts', () => {
    it('should split evenly when company anticipation type is automatic and payment method is boleto', () => {
      const transaction = boletoTransaction({ amount: 1000 })
      const company = companyWithAutomaticAnticipation()
      const anticipation = anticipationPerMonth()
      const mdr = { mdr_amount: 30, mdr_type: FLAT }

      const result = calculateInstallmentsAmounts(
        transaction,
        company,
        mdr,
        anticipation
      )

      expect(result.length).to.equal(transaction.installments)
      expect(result[0].liquid_amount).to.equal(970)
      expect(result[0].mdr_fee).to.equal(30)
      expect(result[0].fee).to.equal(30)
    })

    it('should split evenly when company anticipation type is spot and payment method is boleto', () => {
      const transaction = boletoTransaction({ amount: 1000 })
      const company = companyWithSpotAnticipation()
      const anticipation = anticipationPerMonth()
      const mdr = { mdr_amount: 30, mdr_type: PERCENTAGE }

      const result = calculateInstallmentsAmounts(
        transaction,
        company,
        mdr,
        anticipation
      )

      expect(result.length).to.equal(transaction.installments)
      expect(result[0].liquid_amount).to.equal(700)
      expect(result[0].mdr_fee).to.equal(300)
      expect(result[0].fee).to.equal(300)
    })

    it('should split evenly when company anticipation type is spot and payment method is debit', () => {
      const transaction = debitTransaction()
      const company = companyWithSpotAnticipation()
      const anticipation = anticipationPerMonth()
      const mdr = { mdr_amount: 10, mdr_type: PERCENTAGE }

      const result = calculateInstallmentsAmounts(
        transaction,
        company,
        mdr,
        anticipation
      )

      expect(result.length).to.equal(transaction.installments)
      expect(result[0].liquid_amount).to.equal(45)
      expect(result[0].mdr_fee).to.equal(5)
      expect(result[0].fee).to.equal(5)

      expect(result[1].liquid_amount).to.equal(45)
      expect(result[1].mdr_fee).to.equal(5)
      expect(result[1].fee).to.equal(5)
    })

    it('should split evenly when company anticipation type is automatic and payment method is debit', () => {
      const transaction = debitTransaction()
      const company = companyWithAutomaticAnticipation()
      const anticipation = anticipationPerMonth()
      const mdr = { mdr_amount: 10, mdr_type: PERCENTAGE }

      const result = calculateInstallmentsAmounts(
        transaction,
        company,
        mdr,
        anticipation
      )

      expect(result.length).to.equal(transaction.installments)
      expect(result[0].liquid_amount).to.equal(45)
      expect(result[0].mdr_fee).to.equal(5)
      expect(result[0].fee).to.equal(5)

      expect(result[1].liquid_amount).to.equal(45)
      expect(result[1].mdr_fee).to.equal(5)
      expect(result[1].fee).to.equal(5)
    })

    it('should split with fees when company anticipation type is automatic and payment method is credit', () => {
      const transaction = creditTransaction()
      const company = companyWithAutomaticAnticipation()
      const anticipation = anticipationPerMonth()
      const mdr = { mdr_amount: 10, mdr_type: PERCENTAGE }

      const result = calculateInstallmentsAmounts(
        transaction,
        company,
        mdr,
        anticipation
      )

      return result.then(r => {
        expect(r.length).to.equal(transaction.installments)
        expect(r[0].liquid_amount).to.equal(44)
        expect(r[0].mdr_fee).to.equal(5)
        expect(r[0].fee).to.equal(6)
        expect(r[0].anticipation_fee).to.equal(1)

        expect(r[1].liquid_amount).to.equal(43)
        expect(r[1].mdr_fee).to.equal(5)
        expect(r[1].fee).to.equal(7)
        expect(r[1].anticipation_fee).to.equal(2)

        return r
      })
    })

    it('should split evenly when anticipation type is per_installment', () => {
      const transaction = creditTransaction()
      const company = companyWithAutomaticAnticipation()
      const anticipation = anticipationPerInstallment()
      const mdr = { mdr_amount: 10, mdr_type: PERCENTAGE }

      const result = calculateInstallmentsAmounts(
        transaction,
        company,
        mdr,
        anticipation
      )

      return result.then(r => {
        expect(r.length).to.equal(transaction.installments)
        expect(r[0].liquid_amount).to.equal(43)
        expect(r[0].mdr_fee).to.equal(5)
        expect(r[0].fee).to.equal(7)
        expect(r[0].anticipation_fee).to.equal(2)

        expect(r[1].liquid_amount).to.equal(43)
        expect(r[1].mdr_fee).to.equal(5)
        expect(r[1].fee).to.equal(7)
        expect(r[1].anticipation_fee).to.equal(2)

        return r
      })
    })
  })

  context('getCostsFromCompanyOrAffiliation', () => {
    it('should calculate the costs based on the company', () => {
      const transaction = creditTransaction()
      const company = companyWithCosts()
      const affiliation = affiliationWithoutCosts()

      const result = getCostsFromCompanyOrAffiliation(
        transaction,
        company,
        affiliation
      )

      expect(result.anticipation_cost).to.equal(2)
      expect(result.mdr).to.equal(2)
      expect(result.mdr_type).to.equal('percentage')
    })

    it('should calculate the costs based on the affiliation', () => {
      const transaction = creditTransaction()
      const company = companyWithoutCosts()
      const affiliation = affiliationWithCosts()

      const result = getCostsFromCompanyOrAffiliation(
        transaction,
        company,
        affiliation
      )

      expect(result.anticipation_cost).to.equal(2)
      expect(result.mdr).to.equal(4)
      expect(result.mdr_type).to.equal('percentage')
    })

    it('should calculate the costs based on the defaults', () => {
      const transaction = creditTransaction()
      const company = companyWithoutCosts()
      const affiliation = affiliationWithoutCosts()

      const result = getCostsFromCompanyOrAffiliation(
        transaction,
        company,
        affiliation
      )

      expect(result.anticipation_cost).to.equal(1.99)
      expect(result.mdr).to.be.undefined
      expect(result.mdr_type).to.be.undefined
    })

    it('should calculate the costs based on the company but no mdr', () => {
      const transaction = creditTransaction()
      const company = companyWithCostsAndNoMdr()
      const affiliation = affiliationWithoutCosts()

      const result = getCostsFromCompanyOrAffiliation(
        transaction,
        company,
        affiliation
      )

      expect(result.anticipation_cost).to.equal(2)
      expect(result.mdr).to.equal(3)
      expect(result.mdr_type).to.equal('percentage')
    })

    it('should calculate the costs based on the affiliation but no brands', () => {
      const transaction = creditTransaction()
      const company = companyWithoutCosts()
      const affiliation = affiliationWithCostsAndNoBrands()

      const result = getCostsFromCompanyOrAffiliation(
        transaction,
        company,
        affiliation
      )

      expect(result.anticipation_cost).to.equal(2)
      expect(result.mdr).to.equal(DEFAULT_CARD_MDR_COST)
      expect(result.mdr_type).to.equal('percentage')
    })

    it('should calculate a boleto transaction with costs based on the affiliation', () => {
      const transaction = boletoTransaction({ amount: 1000 })
      const company = companyWithoutCosts()
      const affiliation = generateAffiliation({
        boleto_pricing: { amount: 30, amount_type: FLAT }
      })

      const result = getCostsFromCompanyOrAffiliation(
        transaction,
        company,
        affiliation
      )

      expect(result.anticipation_cost).to.equal(2)
      expect(result.mdr).to.equal(30)
      expect(result.mdr_type).to.equal(FLAT)
    })

    it('should calculate a boleto transaction with costs based on the affiliation and with company costs defined', () => {
      const transaction = boletoTransaction({ amount: 1000 })
      const company = companyWithCosts()
      const affiliation = generateAffiliation({
        boleto_pricing: { amount: 30, amount_type: FLAT }
      })

      const result = getCostsFromCompanyOrAffiliation(
        transaction,
        company,
        affiliation
      )

      expect(result.anticipation_cost).to.equal(2)
      expect(result.mdr).to.equal(30)
      expect(result.mdr_type).to.equal(FLAT)
    })

    it('should calculate to a boleto transaction the costs based on the affiliation but no brands', () => {
      const transaction = boletoTransaction({ amount: 1000 })
      const company = companyWithoutCosts()
      const affiliation = generateAffiliation({
        boleto_pricing: {}
      })

      const result = getCostsFromCompanyOrAffiliation(
        transaction,
        company,
        affiliation
      )

      expect(result.anticipation_cost).to.equal(2)
      expect(result.mdr).to.equal(300)
      expect(result.mdr_type).to.equal(FLAT)
    })
  })

  context('createSplitWithFeeRule', () => {
    it('should split the rules with credit transaction with card brand in card_brand instead of card.brand and a simple fee', () => {
      const transaction = creditTransaction()
      transaction.card_brand = transaction.card.brand
      delete transaction.card

      const company = companyWithoutCosts()
      const rule = feeRule()

      const result = createSplitWithFeeRule(rule, transaction, company)

      return result.then(r => {
        expect(r.length).to.equal(transaction.installments)
        expect(r[0].amount).to.equal(92)
        expect(r[0].charge_processing_cost).to.equal(false)
        expect(r[0].liable).to.equal(true)
        expect(r[0].company_id).to.equal(company._id)

        expect(r[1].amount).to.equal(8)
        expect(r[1].charge_processing_cost).to.equal(true)
        expect(r[1].liable).to.equal(false)
        expect(r[1].company_id).to.equal(company.parent_id)

        return r
      })
    })

    it('should split the rules with credit transaction and a simple fee', () => {
      const transaction = creditTransaction()
      const company = companyWithoutCosts()
      const rule = feeRule()

      const result = createSplitWithFeeRule(rule, transaction, company)

      return result.then(r => {
        expect(r.length).to.equal(transaction.installments)
        expect(r[0].amount).to.equal(92)
        expect(r[0].charge_processing_cost).to.equal(false)
        expect(r[0].liable).to.equal(true)
        expect(r[0].company_id).to.equal(company._id)

        expect(r[1].amount).to.equal(8)
        expect(r[1].charge_processing_cost).to.equal(true)
        expect(r[1].liable).to.equal(false)
        expect(r[1].company_id).to.equal(company.parent_id)

        return r
      })
    })

    it('should split the rules with default mdr', () => {
      const transaction = debitTransaction()
      const company = companyWithoutCosts()
      const rule = feeRuleWithNoBrands()

      const result = createSplitWithFeeRule(rule, transaction, company)

      return result.then(r => {
        expect(r.length).to.equal(transaction.installments)
        expect(r[0].amount).to.equal(98)
        expect(r[0].charge_processing_cost).to.equal(false)
        expect(r[0].liable).to.equal(true)
        expect(r[0].company_id).to.equal(company._id)

        expect(r[1].amount).to.equal(2)
        expect(r[1].charge_processing_cost).to.equal(true)
        expect(r[1].liable).to.equal(false)
        expect(r[1].company_id).to.equal(company.parent_id)

        return r
      })
    })

    it('should split the rules with boleto transaction', async () => {
      const transaction = boletoTransaction({ amount: 1000 })
      const company = companyWithoutCosts()
      const rule = feeRuleWithBoletoPricingBasedOnPercentage()

      const result = createSplitWithFeeRule(rule, transaction, company)

      return result.then(r => {
        expect(r[0].amount).to.equal(970)
        expect(r[0].charge_processing_cost).to.equal(false)
        expect(r[0].liable).to.equal(true)
        expect(r[0].company_id).to.equal(company._id)

        expect(r[1].amount).to.equal(30)
        expect(r[1].charge_processing_cost).to.equal(true)
        expect(r[1].liable).to.equal(false)
        expect(r[1].company_id).to.equal(company.parent_id)

        return r
      })
    })

    it('should split the rules of the boleto transaction with mdr based on percentage', () => {
      const transaction = boletoTransaction({ amount: 1000 })
      const company = companyWithoutCosts()
      const rule = feeRule()

      const result = createSplitWithFeeRule(rule, transaction, company)

      return result.then(r => {
        expect(r[0].amount).to.equal(997)
        expect(r[0].charge_processing_cost).to.equal(false)
        expect(r[0].liable).to.equal(true)
        expect(r[0].company_id).to.equal(company._id)

        expect(r[1].amount).to.equal(3)
        expect(r[1].charge_processing_cost).to.equal(true)
        expect(r[1].liable).to.equal(false)
        expect(r[1].company_id).to.equal(company.parent_id)

        return r
      })
    })

    it('should split the rules with boleto transaction with default mdr', () => {
      const transaction = boletoTransaction({ amount: 1000 })
      const company = companyWithoutCosts()
      const rule = feeRuleWithNoBrands()

      const result = createSplitWithFeeRule(rule, transaction, company)

      return result.then(r => {
        expect(r[0].amount).to.equal(600)
        expect(r[0].charge_processing_cost).to.equal(false)
        expect(r[0].liable).to.equal(true)
        expect(r[0].company_id).to.equal(company._id)

        expect(r[1].amount).to.equal(400)
        expect(r[1].charge_processing_cost).to.equal(true)
        expect(r[1].liable).to.equal(false)
        expect(r[1].company_id).to.equal(company.parent_id)

        return r
      })
    })
  })

  context('validateSplitRule', () => {
    it('should not throw errors when the amounts match', () => {
      const validation = () => {
        const transaction = debitTransaction()
        const rules = splitRulesOnlyAmount(transaction.amount)
        validateSplitRule(null, transaction, rules)
      }

      expect(validation).to.not.throw()
    })

    it('should throw errors when the amounts do not match', () => {
      const validation = () => {
        const transaction = debitTransaction()
        const rules = splitRulesAmountNotOk(transaction.amount)
        validateSplitRule(null, transaction, rules)
      }

      expect(validation).to.throw(InvalidSplitRuleAmountError)
    })

    it('should not throw errors when the percentages match', () => {
      const validation = () => {
        const transaction = debitTransaction()
        const rules = splitRulesOnlyPercentage()
        validateSplitRule(null, transaction, rules)
      }

      expect(validation).to.not.throw()
    })

    it('should throw errors when the percentages do not match', () => {
      const validation = () => {
        const transaction = debitTransaction()
        const rules = splitRulesPercentageNotOk()
        validateSplitRule(null, transaction, rules)
      }

      expect(validation).to.throw(InvalidSplitRulePercentageError)
    })

    it('should throw errors when the percentage and amount are mixed', () => {
      const validation = () => {
        const transaction = debitTransaction()
        const rules = [
          splitRulePercentage(100),
          splitRuleAmount(transaction.amount)
        ]
        validateSplitRule(null, transaction, rules)
      }

      expect(validation).to.throw(InvalidSplitRulePercentageError)
    })

    it('should throw errors when the amount and percentage are mixed', () => {
      const validation = () => {
        const transaction = debitTransaction()
        const rules = [
          splitRuleAmount(transaction.amount),
          splitRulePercentage(100)
        ]
        validateSplitRule(null, transaction, rules)
      }

      expect(validation).to.throw(InvalidSplitRuleAmountError)
    })
  })

  context('validateDefaultSplitRule', () => {
    it('should not throw errors when the company_id not in default_split_rules', () => {
      const validation = () => {
        const default_split_rules = [
          {
            percentage: 30,
            company_id: 'company_A',
            charge_processing_cost: false
          },
          {
            percentage: 5,
            company_id: 'company_B',
            charge_processing_cost: false
          }
        ]

        const company = {
          id_str: 'company_C'
        }

        validateDefaultSplitRule(null, default_split_rules, company)
      }

      expect(validation).to.not.throw()
    })

    it('should not throw errors when the company is undefined', () => {
      const validation = () => {
        const default_split_rules = [
          {
            percentage: 30,
            company_id: 'company_A',
            charge_processing_cost: false
          },
          {
            percentage: 5,
            company_id: 'company_B',
            charge_processing_cost: false
          }
        ]

        validateDefaultSplitRule(null, default_split_rules)
        validateDefaultSplitRule(null, default_split_rules, null)
        validateDefaultSplitRule(null, default_split_rules, {})
      }

      expect(validation).to.not.throw()
    })

    it('should throw errors when the company_id in default_split_rules', () => {
      const validation = () => {
        const default_split_rules = [
          {
            percentage: 30,
            company_id: 'company_A',
            charge_processing_cost: false
          },
          {
            percentage: 5,
            company_id: 'company_B',
            charge_processing_cost: false
          }
        ]

        const company = {
          id_str: 'company_A'
        }

        validateDefaultSplitRule(null, default_split_rules, company)
      }

      expect(validation).to.throw(InvalidSplitRuleSameCompanyIdError)
    })

    it('should not throw errors when valid payload', () => {
      const validation = () => {
        const default_split_rules = [
          {
            percentage: 30,
            company_id: 'company_A',
            charge_processing_cost: false
          },
          {
            percentage: 5,
            company_id: 'company_B',
            charge_processing_cost: false
          }
        ]

        validateDefaultSplitRule(null, default_split_rules)
      }

      expect(validation).to.not.throw()
    })

    it('should throw errors when invalid percentages', () => {
      const validation = () => {
        const default_split_rules = [
          {
            company_id: 'company_A',
            charge_processing_cost: false
          },
          {
            percentage: null,
            company_id: 'company_B',
            charge_processing_cost: false
          }
        ]

        validateDefaultSplitRule(null, default_split_rules)
      }

      expect(validation).to.throw(InvalidSplitRulePercentageError)
    })

    it('should throw errors when excessive percentages', () => {
      const validation = () => {
        const default_split_rules = [
          {
            percentage: 90,
            company_id: 'company_A',
            charge_processing_cost: false
          },
          {
            percentage: 50,
            company_id: 'company_B',
            charge_processing_cost: false
          }
        ]

        validateDefaultSplitRule(null, default_split_rules)
      }

      expect(validation).to.throw(InvalidSplitRulePercentageError)
    })
  })

  context('applyAmountForPercentageSplitRule', () => {
    it('should create split rules with sum of amount matching transaction amount', () => {
      const transaction = creditTransaction()
      const company = companyWithDefaultSplitRules()

      const result = applyAmountForPercentageSplitRule(
        transaction,
        company.default_split_rules
      )

      let resultAmountSum = 0

      result.forEach(split => {
        resultAmountSum += split.amount
      })

      expect(resultAmountSum).to.equal(100)
    })

    it('should create correctly default split rule to registered company', () => {
      const transaction = creditTransaction()
      const company = companyWithDefaultSplitRules()

      const result = applyAmountForPercentageSplitRule(
        transaction,
        company.default_split_rules
      )

      expect(result[0].amount).to.equal(60)
      expect(result[0].company_id).to.equal('uid_third')
    })

    it('should add remaining amount to company owner of the transaction', () => {
      const transaction = creditTransaction()
      const company = companyWithDefaultSplitRules()

      const result = applyAmountForPercentageSplitRule(
        transaction,
        company.default_split_rules
      )

      expect(result[1].amount).to.equal(40)
      expect(result[1].company_id).to.equal('c_uid')
    })

    // Rounding rule: 86*0,6 = 51,6 should be rounded to 51 using Math.floor() function
    it('should correctly round decimal amount of default split rule', () => {
      const transaction = weirdAmountTransaction(86)
      const company = companyWithDefaultSplitRules()

      const result = applyAmountForPercentageSplitRule(
        transaction,
        company.default_split_rules
      )

      expect(result[0].amount).to.equal(51)
      expect(result[0].company_id).to.equal('uid_third')
      expect(result[1].amount).to.equal(35)
      expect(result[1].company_id).to.equal('c_uid')
    })

    it('should add charge processing cost to company owner when it is missing', () => {
      const transaction = creditTransaction()
      const company = companyWithDefaultSplitRules()

      const result = applyAmountForPercentageSplitRule(
        transaction,
        company.default_split_rules
      )

      expect(result[0].charge_processing_cost).to.equal(false)
      expect(result[0].company_id).to.equal('uid_third')
      expect(result[1].charge_processing_cost).to.equal(true)
      expect(result[1].company_id).to.equal('c_uid')
    })

    forEach([
      [[100, 70, 30], [70, 30]],
      [[1000, 70, 30], [700, 300]],
      [[47423, 70, 30], [33197, 14226]],
      [[3500, 70, 30], [2450, 1050]],
      [[1, 80, 20], [1, 0]],
      [[1111500, 35, 65], [389025, 722475]],
      [[111500, 0, 100], [0, 111500]]
    ]).it(
      'should create split rule for transaction with split_rules having only percentage',
      (
        [transactionAmount, originPercentage, secondaryPercentage],
        [originAmount, secondaryAmount],
        done
      ) => {
        const originCompanyId = 'a'
        const secondaryCompanyId = 'b'

        const transaction = creditTransaction()
        transaction.amount = transactionAmount
        transaction.company_id = originCompanyId

        const splitRules = [
          splitRulePercentage(originPercentage, originCompanyId),
          splitRulePercentage(secondaryPercentage, secondaryCompanyId)
        ]

        const result = applyAmountForPercentageSplitRule(
          transaction,
          splitRules
        )

        const originCompanySplitWithAmount = result.find(
          ({ company_id }) => company_id === originCompanyId
        )

        const secondaryCompanySplitWithAmount = result.find(
          ({ company_id }) => company_id === secondaryCompanyId
        )

        if (!secondaryCompanySplitWithAmount) {
          const originCompanyAmount = originCompanySplitWithAmount.amount
          expect(result).to.have.lengthOf(1)
          expect(originCompanyAmount).to.be.eq(transactionAmount)
          done()
        }

        if (!originCompanySplitWithAmount) {
          const secondaryCompanyAmount = secondaryCompanySplitWithAmount.amount
          expect(result).to.have.lengthOf(1)
          expect(secondaryCompanyAmount).to.be.eq(transactionAmount)
          done()
        }

        expect(originCompanySplitWithAmount.amount).to.eq(originAmount)
        expect(secondaryCompanySplitWithAmount.amount).to.eq(secondaryAmount)
        done()
      }
    )
  })

  context('parseHammerData', () => {
    let baseTransactionData

    beforeEach(() => {
      baseTransactionData = {
        provider: 'hash',
        amount: 4512,
        installments: 1,
        company_id: 'company-mongo-id',
        transaction_id: '01E37VG27TPQ304JZVJ2WNXNQY',
        hardware_id: 'mongo-id-1',
        serial_number: '1470092499',
        captured_at: moment('2020-03-12T17:08:29+00:00').format(),
        acquirer_created_at: moment('2020-03-12T17:08:29+00:00').format(),
        acquirer_name: 'pags',
        nsu: '002347',
        card_brand: 'MAESTRO',
        card_first_digits: '123456',
        card_holder_name: 'Caio Shows',
        card_last_digits: '7890',
        capture_method: EMV,
        payment_method: DEBIT_CARD,
        status: PAID
      }
    })

    it('Should throw SyntaxError if hammerBase64Data is not a valid Base64 JSON', () => {
      expect(() => parseHammerData('1%2%3')).to.throw(SyntaxError)
    })

    it('Should parse Base64 data and build transaction payload, ignoring extra fields', () => {
      const base64 =
        'ew0KICAiaWQiOiAiMDFFMzdWRzI3VFBRMzA0SlpWSjJXTlhOUVkiLA0KICAiYWNxdWlyZXJfaWQiOiAicGFnc2VndXJvIiwNCiAgImlzb19pZCI6ICJoYXNoLWhvbW9sb2dhY2FvIiwNCiAgImlzb19oYXNoX2lkIjogIm1vbmdvLWlkIiwNCiAgIm1lcmNoYW50X2lkIjogIkhTSDEyMzQ1Njc4OTAxMiIsDQogICJtZXJjaGFudF9oYXNoX2lkIjogImNvbXBhbnktbW9uZ28taWQiLA0KICAiYWNxdWlyZXJfbWVyY2hhbnRfaWQiOiAiVDQ1OTMxMjU4NTg5NDFBIiwNCiAgInRlcm1pbmFsX2lkIjogIkhTSDEyMzQ1IiwNCiAgInRlcm1pbmFsX2hhc2hfaWQiOiAibW9uZ28taWQtMSIsDQogICJhY3F1aXJlcl90ZXJtaW5hbF9pZCI6ICIxNTExMlBQMyIsDQogICJvcmlnaW5hbF90cmFuc2FjdGlvbl9pZCI6ICIwMUUzN1ZCUUVTTjI1UTY0WDJYRVg1SkFGMCIsDQogICJvcGVyYXRpb24iOiAicmVmdW5kIiwNCiAgInBheW1lbnRfbWV0aG9kIjogImRlYml0IiwNCiAgImFtb3VudCI6IDQ1MTIsDQogICJ0cmFuc21pc3Npb25fZGF0ZSI6ICIwMzEyMTcwODI5IiwNCiAgIm5zdSI6ICIwMDIzNDciLA0KICAiY2FwdHVyZV9tZXRob2QiOiAiZW12IiwNCiAgImluc3RhbGxtZW50cyI6IDEsDQogICJjYXJkaG9sZGVyX25hbWUiOiAiQ2FpbyBTaG93cyIsDQogICJjYXJkX2ZpcnN0X2RpZ2l0cyI6ICIxMjM0NTYiLA0KICAiY2FyZF9sYXN0X2RpZ2l0cyI6ICI3ODkwIiwNCiAgImNhcmRfYnJhbmQiOiAiTUFFU1RSTyIsDQogICJjYXJkX2FwcF9uYW1lIjogIiIsDQogICJjYXJkX2FpZCI6ICIiLA0KICAiY2FyZF9jdm0iOiAiIiwNCiAgImNhcmRfcGluX21vZGUiOiAib2ZmbGluZSIsDQogICJsaWJyYXJ5X3ZlcnNpb24iOiAiMS4wOGEiLA0KICAiYXBwX3ZlcnNpb24iOiAiMTMiLA0KICAic2VyaWFsX251bWJlciI6ICIxNDcwMDkyNDk5IiwNCiAgIm1hbnVmYWN0dXJlciI6ICJQQVgiLA0KICAibW9kZWwiOiAiZDE5NSIsDQogICJzdGF0dXMiOiAiY29uZmlybWVkIiwNCiAgImlzc3Vlcl90cmFuc21pc3Npb25fZGF0ZSI6ICIwMzEyMTcwODI4IiwNCiAgImlzc3Vlcl9hdXRob3JpemVyX25zdSI6ICIwMDA1MTcwMDIxODIiLA0KICAiaXNzdWVyX2F1dGhvcml6YXRpb25fY29kZSI6ICIwMDAyNzEiLA0KICAiY3JlYXRlZF9hdCI6ICIyMDIwLTAzLTEyVDE3OjA4OjI5LjU2Mjk5M1oiLA0KICAidXBkYXRlZF9hdCI6ICIyMDIwLTAzLTEyVDE3OjA4OjMzLjAzNzgwOVoiDQp9='

      const { transactionData } = parseHammerData(base64)

      expect(transactionData).to.deep.equal(baseTransactionData)
    })

    it('Should parse credit card and magnetic stripe methods correctly, with refused by issuer status', () => {
      const base64 =
        'eyJpZCI6ICIwMUUzN1ZHMjdUUFEzMDRKWlZKMldOWE5RWSIsDQogICJhY3F1aXJlcl9pZCI6ICJwYWdzZWd1cm8iLA0KICAibWVyY2hhbnRfaGFzaF9pZCI6ICJjb21wYW55LW1vbmdvLWlkIiwNCiAgInRlcm1pbmFsX2hhc2hfaWQiOiAibW9uZ28taWQtMSIsDQogICJwYXltZW50X21ldGhvZCI6ICJjcmVkaXQiLA0KICAiYW1vdW50IjogNDUxMiwNCiAgIm5zdSI6ICIwMDIzNDciLA0KICAiY2FwdHVyZV9tZXRob2QiOiAibWFnbmV0aWMtc3RyaXBlIiwNCiAgImluc3RhbGxtZW50cyI6IDEsDQogICJjYXJkaG9sZGVyX25hbWUiOiAiQ2FpbyBTaG93cyIsDQogICJjYXJkX2ZpcnN0X2RpZ2l0cyI6ICIxMjM0NTYiLA0KICAiY2FyZF9sYXN0X2RpZ2l0cyI6ICI3ODkwIiwNCiAgImNhcmRfYnJhbmQiOiAiTUFFU1RSTyIsDQogICJzZXJpYWxfbnVtYmVyIjogIjE0NzAwOTI0OTkiLA0KICAic3RhdHVzIjogImRlbmllZF9pc3N1ZXIiLA0KICAiY3JlYXRlZF9hdCI6ICIyMDIwLTAzLTEyVDE3OjA4OjI5LjU2Mjk5M1oifQ=='

      const { transactionData } = parseHammerData(base64)
      baseTransactionData.payment_method = CREDIT_CARD
      baseTransactionData.capture_method = MAGSTRIPE
      baseTransactionData.status = REFUSED

      expect(transactionData).to.deep.equal(baseTransactionData)
    })

    it('Should parse boleto and e-commerce methods correctly, with refused by terminal status', () => {
      const base64 =
        'eyJpZCI6ICIwMUUzN1ZHMjdUUFEzMDRKWlZKMldOWE5RWSIsDQogICJhY3F1aXJlcl9pZCI6ICJwYWdzZWd1cm8iLA0KICAibWVyY2hhbnRfaGFzaF9pZCI6ICJjb21wYW55LW1vbmdvLWlkIiwNCiAgInRlcm1pbmFsX2hhc2hfaWQiOiAibW9uZ28taWQtMSIsDQogICJwYXltZW50X21ldGhvZCI6ICJiYW5rLXNsaXAiLA0KICAiYW1vdW50IjogNDUxMiwNCiAgIm5zdSI6ICIwMDIzNDciLA0KICAiY2FwdHVyZV9tZXRob2QiOiAiZS1jb21tZXJjZSIsDQogICJpbnN0YWxsbWVudHMiOiAxLA0KICAiY2FyZGhvbGRlcl9uYW1lIjogIkNhaW8gU2hvd3MiLA0KICAiY2FyZF9maXJzdF9kaWdpdHMiOiAiMTIzNDU2IiwNCiAgImNhcmRfbGFzdF9kaWdpdHMiOiAiNzg5MCIsDQogICJjYXJkX2JyYW5kIjogIk1BRVNUUk8iLA0KICAic2VyaWFsX251bWJlciI6ICIxNDcwMDkyNDk5IiwNCiAgInN0YXR1cyI6ICJkZW5pZWRfdGVybWluYWwiLA0KICAiY3JlYXRlZF9hdCI6ICIyMDIwLTAzLTEyVDE3OjA4OjI5LjU2Mjk5M1oifQ=='

      const { transactionData } = parseHammerData(base64)
      baseTransactionData.payment_method = BOLETO
      baseTransactionData.capture_method = ECOMMERCE
      baseTransactionData.status = REFUSED
      delete baseTransactionData.card

      expect(transactionData).to.deep.equal(baseTransactionData)
    })

    it('Should parse money and magnetic fallback methods correctly', () => {
      const base64 =
        'eyJpZCI6ICIwMUUzN1ZHMjdUUFEzMDRKWlZKMldOWE5RWSIsDQogICJhY3F1aXJlcl9pZCI6ICJwYWdzZWd1cm8iLA0KICAibWVyY2hhbnRfaGFzaF9pZCI6ICJjb21wYW55LW1vbmdvLWlkIiwNCiAgInRlcm1pbmFsX2hhc2hfaWQiOiAibW9uZ28taWQtMSIsDQogICJwYXltZW50X21ldGhvZCI6ICJtb25leSIsDQogICJhbW91bnQiOiA0NTEyLA0KICAibnN1IjogIjAwMjM0NyIsDQogICJjYXB0dXJlX21ldGhvZCI6ICJtYWduZXRpYy1mYWxsYmFjayIsDQogICJpbnN0YWxsbWVudHMiOiAxLA0KICAiY2FyZGhvbGRlcl9uYW1lIjogIkNhaW8gU2hvd3MiLA0KICAiY2FyZF9maXJzdF9kaWdpdHMiOiAiMTIzNDU2IiwNCiAgImNhcmRfbGFzdF9kaWdpdHMiOiAiNzg5MCIsDQogICJjYXJkX2JyYW5kIjogIk1BRVNUUk8iLA0KICAic2VyaWFsX251bWJlciI6ICIxNDcwMDkyNDk5IiwNCiAgInN0YXR1cyI6ICJjb25maXJtZWQiLA0KICAiY3JlYXRlZF9hdCI6ICIyMDIwLTAzLTEyVDE3OjA4OjI5LjU2Mjk5M1oifQ=='

      const { transactionData } = parseHammerData(base64)
      baseTransactionData.payment_method = MONEY
      baseTransactionData.capture_method = MAGSTRIPE
      delete baseTransactionData.card

      expect(transactionData).to.deep.equal(baseTransactionData)
    })
  })

  context('parseTransactionEventData', () => {
    it('Should parse cloud event data', () => {
      const expectedTransactionData = {
        provider: 'hash',
        amount: 100,
        installments: 1,
        company_id: '5eb4063f6d2d4700068763da',
        transaction_id: '01ET2WHJB78Y641WFRQAK05R91',
        hardware_id: '5fe0b5867feda000060dfd56',
        serial_number: '1470519716',
        captured_at: moment('2020-12-21T14:51:38+00:00').format(),
        captured_by: 'hash',
        acquirer_created_at: moment('2020-12-21T14:51:38+00:00').format(),
        acquirer_name: 'pags',
        acquirer_response_code: '00',
        nsu: '005788',
        card_brand: 'MASTERCARD',
        card_first_digits: '524571',
        card_holder_name: 'CLIENTE ACESSOCARD',
        card_last_digits: '4398',
        capture_method: EMV,
        payment_method: CREDIT_CARD,
        status: PAID,
        metadata: {
          acquirer_name: 'pagseguro',
          acquirer_transaction_id: '712A81A6-A666-49B9-BBA9-DD57A225A544'
        }
      }
      const cloudEventPayload = `
      {
        "data":{
          "id":"01ET2WHJB78Y641WFRQAK05R91",
          "hashCorrelationKey":"bc58a45d-c87f-416e-9569-000054415049",
          "isoID":"5cf141b986642840656717f0",
          "merchantID":"5eb4063f6d2d4700068763da",
          "merchantCategoryCode":"5211",
          "terminalID":"5fe0b5867feda000060dfd56",
          "authorizerData":{
            "name":"pagseguro",
            "uniqueID":"712A81A6-A666-49B9-BBA9-DD57A225A544",
            "dateTime":"2020-12-21T11:51:38-03:00",
            "responseCode":"00",
            "authorizationCode":"184627",
            "specificData":{
              "affiliationID":"139235585"
            }
          },
          "paymentNetworkData":{
            "name":"Mastercard Cartão de Crédito",
            "numericCode":"003",
            "alphaCode":"MCC"
          },
          "dateTime":"2020-12-21T11:51:38-03:00",
          "transactionType":"purchase",
          "accountType":"credit",
          "approved":true,
          "crossBorder":false,
          "entryMode":"icc",
          "amount":100,
          "currencyCode":"986",
          "cardholderData":{
            "panFirstDigits":"524571",
            "panLastDigits":"4398",
            "cardholderName":"CLIENTE ACESSOCARD",
            "verificationMethod":"offline-pin",
            "issuerCountryCode":"BRA"
          },
          "deprecated_do_not_use":{
            "do_not_use_1":"MTQ3MDUxOTcxNg==",
            "do_not_use_2":"TUFTVEVSQ0FSRA==",
            "do_not_use_3":"MDA1Nzg4"
          }
        },
        "datacontenttype":"application/json",
        "dataschema":"http://hash.dev/transactionEventServer/v1",
        "id":"01ET2WHJB78Y641WFRQAK05R91",
        "source":"hash.dev/transactionEventServer",
        "specversion":"1.0",
        "type":"dev.hash.events.transaction"
      }
      `
      const cloudEvent = JSON.parse(cloudEventPayload)

      const transactionData = parseTransactionEventData(cloudEvent)

      expect(transactionData).to.deep.equal(expectedTransactionData)
    })

    it('Should parse cloud event data without cardholderName', () => {
      const expectedTransactionData = {
        provider: 'hash',
        amount: 100,
        installments: 1,
        company_id: '5eb4063f6d2d4700068763da',
        transaction_id: '01ET2WHJB78Y641WFRQAK05R91',
        hardware_id: '5fe0b5867feda000060dfd56',
        serial_number: '1470519716',
        captured_at: moment('2020-12-21T14:51:38+00:00').format(),
        captured_by: 'hash',
        acquirer_created_at: moment('2020-12-21T14:51:38+00:00').format(),
        acquirer_name: 'pags',
        acquirer_response_code: '00',
        nsu: '005788',
        card_brand: 'MASTERCARD',
        card_first_digits: '524571',
        card_holder_name: '',
        card_last_digits: '4398',
        capture_method: EMV,
        payment_method: CREDIT_CARD,
        status: PAID,
        metadata: {
          acquirer_name: 'pagseguro',
          acquirer_transaction_id: '712A81A6-A666-49B9-BBA9-DD57A225A544'
        }
      }
      const cloudEventPayload = `
      {
        "data":{
          "id":"01ET2WHJB78Y641WFRQAK05R91",
          "hashCorrelationKey":"bc58a45d-c87f-416e-9569-000054415049",
          "isoID":"5cf141b986642840656717f0",
          "merchantID":"5eb4063f6d2d4700068763da",
          "merchantCategoryCode":"5211",
          "terminalID":"5fe0b5867feda000060dfd56",
          "authorizerData":{
            "name":"pagseguro",
            "uniqueID":"712A81A6-A666-49B9-BBA9-DD57A225A544",
            "dateTime":"2020-12-21T11:51:38-03:00",
            "responseCode":"00",
            "authorizationCode":"184627",
            "specificData":{
              "affiliationID":"139235585"
            }
          },
          "paymentNetworkData":{
            "name":"Mastercard Cartão de Crédito",
            "numericCode":"003",
            "alphaCode":"MCC"
          },
          "dateTime":"2020-12-21T11:51:38-03:00",
          "transactionType":"purchase",
          "accountType":"credit",
          "approved":true,
          "crossBorder":false,
          "entryMode":"icc",
          "amount":100,
          "currencyCode":"986",
          "cardholderData":{
            "panFirstDigits":"524571",
            "panLastDigits":"4398",
            "verificationMethod":"offline-pin",
            "issuerCountryCode":"BRA"
          },
          "deprecated_do_not_use":{
            "do_not_use_1":"MTQ3MDUxOTcxNg==",
            "do_not_use_2":"TUFTVEVSQ0FSRA==",
            "do_not_use_3":"MDA1Nzg4"
          }
        },
        "datacontenttype":"application/json",
        "dataschema":"http://hash.dev/transactionEventServer/v1",
        "id":"01ET2WHJB78Y641WFRQAK05R91",
        "source":"hash.dev/transactionEventServer",
        "specversion":"1.0",
        "type":"dev.hash.events.transaction"
      }
      `
      const cloudEvent = JSON.parse(cloudEventPayload)

      const transactionData = parseTransactionEventData(cloudEvent)

      expect(transactionData).to.deep.equal(expectedTransactionData)
    })

    it('Should parse cloud event data with captureChannelData', () => {
      const expectedTransactionData = {
        provider: 'hash',
        amount: 100,
        installments: 1,
        company_id: '5eb4063f6d2d4700068763da',
        transaction_id: '01ET2WHJB78Y641WFRQAK05R91',
        hardware_id: '5fe0b5867feda000060dfd56',
        serial_number: '1470519716',
        captured_at: moment('2020-12-21T14:51:38+00:00').format(),
        captured_by: 'hash-pos',
        acquirer_created_at: moment('2020-12-21T14:51:38+00:00').format(),
        acquirer_name: 'pags',
        acquirer_response_code: '00',
        nsu: '005788',
        card_brand: 'MASTERCARD',
        card_first_digits: '524571',
        card_holder_name: '',
        card_last_digits: '4398',
        capture_method: EMV,
        payment_method: CREDIT_CARD,
        status: PAID,
        metadata: {
          acquirer_name: 'pagseguro',
          acquirer_transaction_id: '712A81A6-A666-49B9-BBA9-DD57A225A544'
        }
      }
      const cloudEventPayload = `
      {
        "data":{
          "id":"01ET2WHJB78Y641WFRQAK05R91",
          "hashCorrelationKey":"bc58a45d-c87f-416e-9569-000054415049",
          "isoID":"5cf141b986642840656717f0",
          "merchantID":"5eb4063f6d2d4700068763da",
          "merchantCategoryCode":"5211",
          "terminalID":"5fe0b5867feda000060dfd56",
          "authorizerData":{
            "name":"pagseguro",
            "uniqueID":"712A81A6-A666-49B9-BBA9-DD57A225A544",
            "dateTime":"2020-12-21T11:51:38-03:00",
            "responseCode":"00",
            "authorizationCode":"184627",
            "specificData":{
              "affiliationID":"139235585"
            }
          },
          "paymentNetworkData":{
            "name":"Mastercard Cartão de Crédito",
            "numericCode":"003",
            "alphaCode":"MCC"
          },
          "dateTime":"2020-12-21T11:51:38-03:00",
          "transactionType":"purchase",
          "accountType":"credit",
          "approved":true,
          "crossBorder":false,
          "entryMode":"icc",
          "amount":100,
          "currencyCode":"986",
          "captureChannelData": {"name":"hash-pos"},
          "cardholderData":{
            "panFirstDigits":"524571",
            "panLastDigits":"4398",
            "verificationMethod":"offline-pin",
            "issuerCountryCode":"BRA"
          },
          "deprecated_do_not_use":{
            "do_not_use_1":"MTQ3MDUxOTcxNg==",
            "do_not_use_2":"TUFTVEVSQ0FSRA==",
            "do_not_use_3":"MDA1Nzg4"
          }
        },
        "datacontenttype":"application/json",
        "dataschema":"http://hash.dev/transactionEventServer/v1",
        "id":"01ET2WHJB78Y641WFRQAK05R91",
        "source":"hash.dev/transactionEventServer",
        "specversion":"1.0",
        "type":"dev.hash.events.transaction"
      }
      `
      const cloudEvent = JSON.parse(cloudEventPayload)

      const transactionData = parseTransactionEventData(cloudEvent)

      expect(transactionData).to.deep.equal(expectedTransactionData)
    })

    it('Should parse cloud event data with captureChannelData.paymentLinkData', () => {
      const expectedTransactionData = {
        provider: 'hash',
        amount: 100,
        antifraud_assessment_id: 'xxx',
        installments: 1,
        company_id: '5eb4063f6d2d4700068763da',
        transaction_id: '01ET2WHJB78Y641WFRQAK05R91',
        hardware_id: '5fe0b5867feda000060dfd56',
        serial_number: null,
        captured_at: moment('2020-12-21T14:51:38+00:00').format(),
        acquirer_created_at: moment('2020-12-21T14:51:38+00:00').format(),
        acquirer_name: 'pags',
        nsu: null,
        capture_method: 'ecommerce',
        payment_method: 'credit_card',
        status: 'paid',
        card_first_digits: '524571',
        card_last_digits: '4398',
        card_holder_name: '',
        card_brand: 'MASTERCARD',
        acquirer_response_code: '00',
        captured_by: 'hash-payment-link',
        acquirer_account_id: '139235585',
        consumer: {
          ip: '34.95.207.236',
          tracking_id: 'ab636cd9-e765-4114-b643-7c126ac09a5f',
          full_name: 'renanpalmeirasantos',
          email: 'renan.palmeira@hash.com.br',
          document_type: 'CPF',
          document_number: '46346008897',
          phone: '11912312321',
          date_of_birth: '1998-01-01T00:00:00Z',
          address: {
            zipcode: '03164150',
            street: 'Rua Guarapuava',
            street_number: '1234',
            neighborhood: 'Mooca',
            state: 'SP',
            city: 'São Paulo'
          }
        },
        metadata: {
          acquirer_name: 'pagseguro',
          acquirer_transaction_id: '712A81A6-A666-49B9-BBA9-DD57A225A544',
          sales_link_id: '9c24c2a3-28bc-4ac6-b837-18b00f9b185d',
          sales_link_tracking_id: 'ab636cd9-e765-4114-b643-7c126ac09a5f',
          sales_link_transaction_request_id:
            '92b84c5b-28a3-46b4-8ee1-b8e90e3f309e',
          short_id: 'HWMQJ08P'
        },
        split_rules: [
          {
            company_id: '5e3dbef53730e400064d56c3',
            amount: 30000,
            charge_processing_cost: false
          },
          {
            company_id: '5d97542e6d0bb000066c05e0',
            amount: 70000,
            charge_processing_cost: true
          }
        ],
        status_reason: 'acquirer',
        captured_by_hash: true
      }
      const cloudEventPayload = `
      {
        "data":{
          "id":"01ET2WHJB78Y641WFRQAK05R91",
          "hashCorrelationKey":"bc58a45d-c87f-416e-9569-000054415049",
          "isoID":"5cf141b986642840656717f0",
          "merchantID":"5eb4063f6d2d4700068763da",
          "merchantCategoryCode":"5211",
          "terminalID":"5fe0b5867feda000060dfd56",
          "authorizerData":{
            "name":"pagseguro",
            "uniqueID":"712A81A6-A666-49B9-BBA9-DD57A225A544",
            "dateTime":"2020-12-21T11:51:38-03:00",
            "responseCode":"00",
            "authorizationCode":"184627",
            "specificData":{
              "affiliationID":"139235585"
            }
          },
          "paymentNetworkData":{
            "name":"Mastercard Cartão de Crédito",
            "numericCode":"003",
            "alphaCode":"MCC"
          },
          "dateTime":"2020-12-21T11:51:38-03:00",
          "transactionType":"purchase",
          "accountType":"credit",
          "approved":true,
          "crossBorder":false,
          "entryMode":"icc",
          "amount":100,
          "currencyCode":"986",
          "captureChannelData":{
            "name":"hash-payment-link",
            "paymentLinkData":{
              "antifraudAssessmentId":"xxx",
              "consumer":{
                "address":{
                  "city":"São Paulo",
                  "neighborhood":"Mooca",
                  "state":"SP",
                  "street":"Rua Guarapuava",
                  "streetNumber":"1234",
                  "zipcode":"03164150"
                },
                "dateOfBirth":"1998-01-01T00:00:00Z",
                "documentNumber":"46346008897",
                "documentType":"CPF",
                "email":"renan.palmeira@hash.com.br",
                "fullName":"renanpalmeirasantos",
                "ip":"34.95.207.236",
                "phone":"11912312321",
                "trackingID":"ab636cd9-e765-4114-b643-7c126ac09a5f"
              },
              "creationTimestamp":"2021-05-27T13:04:18.81-03:00",
              "metadata":{
                "salesLinkID":"9c24c2a3-28bc-4ac6-b837-18b00f9b185d",
                "salesLinkTrackingID":"ab636cd9-e765-4114-b643-7c126ac09a5f",
                "salesLinkTransactionRequestID":"92b84c5b-28a3-46b4-8ee1-b8e90e3f309e",
                "shortID":"HWMQJ08P"
              },
              "splitRules":[
                {
                  "amount":30000,
                  "chargeProcessingCost":false,
                  "companyID":"5e3dbef53730e400064d56c3"
                },
                {
                  "amount":70000,
                  "chargeProcessingCost":true,
                  "companyID":"5d97542e6d0bb000066c05e0"
                }
              ],
              "statusReason":"acquirer"
            }
          },
          "cardholderData":{
            "panFirstDigits":"524571",
            "panLastDigits":"4398",
            "verificationMethod":"offline-pin",
            "issuerCountryCode":"BRA"
          },
          "deprecated_do_not_use":{
            "do_not_use_1":"",
            "do_not_use_2":"TUFTVEVSQ0FSRA==",
            "do_not_use_3":""
          }
        },
        "datacontenttype":"application/json",
        "dataschema":"http://hash.dev/transactionEventServer/v1",
        "id":"01ET2WHJB78Y641WFRQAK05R91",
        "source":"hash.dev/transactionEventServer",
        "specversion":"1.0",
        "type":"dev.hash.events.transaction"
      }
      `
      const cloudEvent = JSON.parse(cloudEventPayload)

      const transactionData = parseTransactionEventData(cloudEvent)

      expect(transactionData).to.deep.equal(expectedTransactionData)
    })

    it('Should parse cloud event data with captureChannelData.paymentLinkData and have empty status_reason', () => {
      const expectedTransactionData = {
        provider: 'hash',
        amount: 100,
        antifraud_assessment_id: 'xxx',
        installments: 1,
        company_id: '5eb4063f6d2d4700068763da',
        transaction_id: '01ET2WHJB78Y641WFRQAK05R91',
        hardware_id: '5fe0b5867feda000060dfd56',
        serial_number: null,
        captured_at: moment('2020-12-21T14:51:38+00:00').format(),
        acquirer_created_at: moment('2020-12-21T14:51:38+00:00').format(),
        acquirer_name: 'pags',
        nsu: null,
        capture_method: 'ecommerce',
        payment_method: 'credit_card',
        status: 'paid',
        card_first_digits: '524571',
        card_last_digits: '4398',
        card_holder_name: '',
        card_brand: 'MASTERCARD',
        acquirer_response_code: '00',
        captured_by: 'hash-payment-link',
        acquirer_account_id: '139235585',
        consumer: {
          ip: '34.95.207.236',
          tracking_id: 'ab636cd9-e765-4114-b643-7c126ac09a5f',
          full_name: 'renanpalmeirasantos',
          email: 'renan.palmeira@hash.com.br',
          document_type: 'CPF',
          document_number: '46346008897',
          phone: '11912312321',
          date_of_birth: '1998-01-01T00:00:00Z',
          address: {
            zipcode: '03164150',
            street: 'Rua Guarapuava',
            street_number: '1234',
            neighborhood: 'Mooca',
            state: 'SP',
            city: 'São Paulo'
          }
        },
        metadata: {
          acquirer_name: 'pagseguro',
          acquirer_transaction_id: '712A81A6-A666-49B9-BBA9-DD57A225A544',
          sales_link_id: '9c24c2a3-28bc-4ac6-b837-18b00f9b185d',
          sales_link_tracking_id: 'ab636cd9-e765-4114-b643-7c126ac09a5f',
          sales_link_transaction_request_id:
            '92b84c5b-28a3-46b4-8ee1-b8e90e3f309e',
          short_id: 'HWMQJ08P'
        },
        split_rules: [
          {
            company_id: '5e3dbef53730e400064d56c3',
            amount: 30000,
            charge_processing_cost: false
          },
          {
            company_id: '5d97542e6d0bb000066c05e0',
            amount: 70000,
            charge_processing_cost: true
          }
        ],
        captured_by_hash: true
      }
      const cloudEventPayload = `
      {
        "data":{
          "id":"01ET2WHJB78Y641WFRQAK05R91",
          "hashCorrelationKey":"bc58a45d-c87f-416e-9569-000054415049",
          "isoID":"5cf141b986642840656717f0",
          "merchantID":"5eb4063f6d2d4700068763da",
          "merchantCategoryCode":"5211",
          "terminalID":"5fe0b5867feda000060dfd56",
          "authorizerData":{
            "name":"pagseguro",
            "uniqueID":"712A81A6-A666-49B9-BBA9-DD57A225A544",
            "dateTime":"2020-12-21T11:51:38-03:00",
            "responseCode":"00",
            "authorizationCode":"184627",
            "specificData":{
              "affiliationID":"139235585"
            }
          },
          "paymentNetworkData":{
            "name":"Mastercard Cartão de Crédito",
            "numericCode":"003",
            "alphaCode":"MCC"
          },
          "dateTime":"2020-12-21T11:51:38-03:00",
          "transactionType":"purchase",
          "accountType":"credit",
          "approved":true,
          "crossBorder":false,
          "entryMode":"icc",
          "amount":100,
          "currencyCode":"986",
          "captureChannelData":{
            "name":"hash-payment-link",
            "paymentLinkData":{
              "antifraudAssessmentId":"xxx",
              "consumer":{
                "address":{
                  "city":"São Paulo",
                  "neighborhood":"Mooca",
                  "state":"SP",
                  "street":"Rua Guarapuava",
                  "streetNumber":"1234",
                  "zipcode":"03164150"
                },
                "dateOfBirth":"1998-01-01T00:00:00Z",
                "documentNumber":"46346008897",
                "documentType":"CPF",
                "email":"renan.palmeira@hash.com.br",
                "fullName":"renanpalmeirasantos",
                "ip":"34.95.207.236",
                "phone":"11912312321",
                "trackingID":"ab636cd9-e765-4114-b643-7c126ac09a5f"
              },
              "creationTimestamp":"2021-05-27T13:04:18.81-03:00",
              "metadata":{
                "salesLinkID":"9c24c2a3-28bc-4ac6-b837-18b00f9b185d",
                "salesLinkTrackingID":"ab636cd9-e765-4114-b643-7c126ac09a5f",
                "salesLinkTransactionRequestID":"92b84c5b-28a3-46b4-8ee1-b8e90e3f309e",
                "shortID":"HWMQJ08P"
              },
              "splitRules":[
                {
                  "amount":30000,
                  "chargeProcessingCost":false,
                  "companyID":"5e3dbef53730e400064d56c3"
                },
                {
                  "amount":70000,
                  "chargeProcessingCost":true,
                  "companyID":"5d97542e6d0bb000066c05e0"
                }
              ]
            }
          },
          "cardholderData":{
            "panFirstDigits":"524571",
            "panLastDigits":"4398",
            "verificationMethod":"offline-pin",
            "issuerCountryCode":"BRA"
          },
          "deprecated_do_not_use":{
            "do_not_use_1":"",
            "do_not_use_2":"TUFTVEVSQ0FSRA==",
            "do_not_use_3":""
          }
        },
        "datacontenttype":"application/json",
        "dataschema":"http://hash.dev/transactionEventServer/v1",
        "id":"01ET2WHJB78Y641WFRQAK05R91",
        "source":"hash.dev/transactionEventServer",
        "specversion":"1.0",
        "type":"dev.hash.events.transaction"
      }
      `
      const cloudEvent = JSON.parse(cloudEventPayload)

      const transactionData = parseTransactionEventData(cloudEvent)

      expect(transactionData).to.deep.equal(expectedTransactionData)
    })

    it('Should parse cloud event data with captureChannelData.paymentLinkData and have empty split_rules', () => {
      const expectedTransactionData = {
        provider: 'hash',
        amount: 100,
        antifraud_assessment_id: 'xxx',
        installments: 1,
        company_id: '5eb4063f6d2d4700068763da',
        transaction_id: '01ET2WHJB78Y641WFRQAK05R91',
        hardware_id: '5fe0b5867feda000060dfd56',
        serial_number: null,
        captured_at: moment('2020-12-21T14:51:38+00:00').format(),
        acquirer_created_at: moment('2020-12-21T14:51:38+00:00').format(),
        acquirer_name: 'pags',
        nsu: null,
        capture_method: 'ecommerce',
        payment_method: 'credit_card',
        status: 'paid',
        card_first_digits: '524571',
        card_last_digits: '4398',
        card_holder_name: '',
        card_brand: 'MASTERCARD',
        acquirer_response_code: '00',
        captured_by: 'hash-payment-link',
        acquirer_account_id: '139235585',
        consumer: {
          ip: '34.95.207.236',
          tracking_id: 'ab636cd9-e765-4114-b643-7c126ac09a5f',
          full_name: 'renanpalmeirasantos',
          email: 'renan.palmeira@hash.com.br',
          document_type: 'CPF',
          document_number: '46346008897',
          phone: '11912312321',
          date_of_birth: '1998-01-01T00:00:00Z',
          address: {
            zipcode: '03164150',
            street: 'Rua Guarapuava',
            street_number: '1234',
            neighborhood: 'Mooca',
            state: 'SP',
            city: 'São Paulo'
          }
        },
        metadata: {
          acquirer_name: 'pagseguro',
          acquirer_transaction_id: '712A81A6-A666-49B9-BBA9-DD57A225A544',
          sales_link_id: '9c24c2a3-28bc-4ac6-b837-18b00f9b185d',
          sales_link_tracking_id: 'ab636cd9-e765-4114-b643-7c126ac09a5f',
          sales_link_transaction_request_id:
            '92b84c5b-28a3-46b4-8ee1-b8e90e3f309e',
          short_id: 'HWMQJ08P'
        },
        captured_by_hash: true
      }
      const cloudEventPayload = `
      {
        "data":{
          "id":"01ET2WHJB78Y641WFRQAK05R91",
          "hashCorrelationKey":"bc58a45d-c87f-416e-9569-000054415049",
          "isoID":"5cf141b986642840656717f0",
          "merchantID":"5eb4063f6d2d4700068763da",
          "merchantCategoryCode":"5211",
          "terminalID":"5fe0b5867feda000060dfd56",
          "authorizerData":{
            "name":"pagseguro",
            "uniqueID":"712A81A6-A666-49B9-BBA9-DD57A225A544",
            "dateTime":"2020-12-21T11:51:38-03:00",
            "responseCode":"00",
            "authorizationCode":"184627",
            "specificData":{
              "affiliationID":"139235585"
            }
          },
          "paymentNetworkData":{
            "name":"Mastercard Cartão de Crédito",
            "numericCode":"003",
            "alphaCode":"MCC"
          },
          "dateTime":"2020-12-21T11:51:38-03:00",
          "transactionType":"purchase",
          "accountType":"credit",
          "approved":true,
          "crossBorder":false,
          "entryMode":"icc",
          "amount":100,
          "currencyCode":"986",
          "captureChannelData":{
            "name":"hash-payment-link",
            "paymentLinkData":{
              "antifraudAssessmentId":"xxx",
              "consumer":{
                "address":{
                  "city":"São Paulo",
                  "neighborhood":"Mooca",
                  "state":"SP",
                  "street":"Rua Guarapuava",
                  "streetNumber":"1234",
                  "zipcode":"03164150"
                },
                "dateOfBirth":"1998-01-01T00:00:00Z",
                "documentNumber":"46346008897",
                "documentType":"CPF",
                "email":"renan.palmeira@hash.com.br",
                "fullName":"renanpalmeirasantos",
                "ip":"34.95.207.236",
                "phone":"11912312321",
                "trackingID":"ab636cd9-e765-4114-b643-7c126ac09a5f"
              },
              "creationTimestamp":"2021-05-27T13:04:18.81-03:00",
              "metadata":{
                "salesLinkID":"9c24c2a3-28bc-4ac6-b837-18b00f9b185d",
                "salesLinkTrackingID":"ab636cd9-e765-4114-b643-7c126ac09a5f",
                "salesLinkTransactionRequestID":"92b84c5b-28a3-46b4-8ee1-b8e90e3f309e",
                "shortID":"HWMQJ08P"
              },
              "splitRules":null
            }
          },
          "cardholderData":{
            "panFirstDigits":"524571",
            "panLastDigits":"4398",
            "verificationMethod":"offline-pin",
            "issuerCountryCode":"BRA"
          },
          "deprecated_do_not_use":{
            "do_not_use_1":"",
            "do_not_use_2":"TUFTVEVSQ0FSRA==",
            "do_not_use_3":""
          }
        },
        "datacontenttype":"application/json",
        "dataschema":"http://hash.dev/transactionEventServer/v1",
        "id":"01ET2WHJB78Y641WFRQAK05R91",
        "source":"hash.dev/transactionEventServer",
        "specversion":"1.0",
        "type":"dev.hash.events.transaction"
      }
      `
      const cloudEvent = JSON.parse(cloudEventPayload)

      const transactionData = parseTransactionEventData(cloudEvent)

      expect(transactionData).to.deep.equal(expectedTransactionData)
    })
  })
})
