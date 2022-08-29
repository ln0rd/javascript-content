import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { IsoRevenueRule } from 'domain/model/iso-revenue-rule'
import { Pricing } from 'domain/model/pricing'
import { SplitRule } from 'domain/model/split-rule'
import logger from 'infrastructure/logger'
import { HashRevenueRulesRepository } from 'infrastructure/repository/hash-revenue-rules-repository'
import { IsoRevenueRulesRepository } from 'infrastructure/repository/iso-revenue-rules-repository'
import { SplitRulesRepository } from 'infrastructure/repository/split-rules-repository'
import * as sinon from 'sinon'
import { CalculatePricingForTransaction } from './calculate-pricing-for-transaction'

describe('Given a transaction with 2 installments', () => {
  const transactionData = {
    id: '1539985',
    hashCorrelationKey: '2501ed2d-c41a-427a-b7f3-40c97d69c7e2',
    isoID: '5cf141b986642840656717f1',
    merchantID: 'merchant_a',
    merchantCategoryCode: '1234',
    terminalID: '1539985',
    authorizerData: {
      name: 'Pagseguro',
      uniqueID: '22781384615723',
      dateTime: '2021-09-03T11:59:07Z',
      responseCode: '00',
      authorizationCode: 'A12285',
      specificData: {
        affiliationID: '139235585',
      },
    },
    paymentNetworkData: {
      name: 'Visa',
      numericCode: '026',
      alphaCode: 'VCD',
    },
    dateTime: '2021-09-03T11:59:05Z',
    transactionType: 'purchase',
    accountType: 'credit',
    approved: true,
    crossBorder: false,
    entryMode: 'icc',
    amount: 10000000,
    currencyCode: '986',
    installmentTransactionData: {
      installmentCount: 2,
      installmentQualifier: 'issuer',
    },
    cardholderData: {
      panFirstDigits: '516292',
      panLastDigits: '0253',
      cardExpirationDate: '0428',
      verificationMethod: 'offline-pin',
      issuerCountryCode: '076',
    },
  }

  let splitRule: SplitRule
  let isoRevenueRule: IsoRevenueRule
  let hashRevenueRule: HashRevenueRule

  let pricing: Pricing

  let loggerStub: sinon.SinonSpy

  afterEach(() => {
    sinon.restore()
  })

  const stubRepositories = () => {
    sinon
      .stub(SplitRulesRepository, 'findActiveRulesByTarget')
      .resolves([splitRule])

    sinon
      .stub(IsoRevenueRulesRepository, 'findActiveRulesByTarget')
      .resolves([isoRevenueRule])

    sinon
      .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
      .resolves([hashRevenueRule])
  }

  describe('and a split rule with 1 instruction', () => {
    beforeAll(() => {
      splitRule = SplitRulesRepository.fromDB(
        {
          id: '63013625-ea67-42bd-bc97-2a094daacdad',
          iso_id: '5cf141b986642840656717f1',
          merchant_id: null,
          pricing_group_id: null,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-30T18:38:10.452Z'),
          deleted_at: null,
        },
        [
          {
            id: '301366ca-8d3e-4412-8dd3-9481dc1e71b6',
            split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
            merchant_id: 'merchant_a',
            percentage: 10000000,
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
        ]
      )
    })

    describe('and there is no matching iso-revenue-rule', () => {
      beforeAll(() => {
        isoRevenueRule = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'non-matching-merchant',
          pricing_group_id: null,
          percentage: 100000,
          use_split_values: true,
          flat: null,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })
      })
      describe('and with hash-revenue-rule with percentage values', () => {
        beforeAll(async () => {
          hashRevenueRule = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: 20000,
            flat: null,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          stubRepositories()

          loggerStub = sinon.spy(logger, 'warn')

          pricing = await new CalculatePricingForTransaction().execute(
            transactionData
          )
        })

        test('generates a warn for each installment in logs', () => {
          expect(
            loggerStub.calledWith(
              'iso-revenue-rule-missing-in-pricing-calculation'
            )
          ).toEqual(true)
          expect(loggerStub.callCount).toEqual(2)
        })

        test('produces a Pricing with details', () => {
          expect(pricing).toEqual({
            transactionId: '1539985',
            splitDetail: expect.any(Array),
            isoRevenueDetail: expect.any(Array),
            hashRevenueDetail: expect.any(Array),
          })
        })

        test('produces a splitDetail with splitAmount for each installment', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 5000000,
              isoRevenueAmount: 0,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 5000000,
              isoRevenueAmount: 0,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 0,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 0,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount for each installment', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 10000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 10000,
            },
          ])
        })
      })

      describe('and with no matching hash-revenue-rule', () => {
        beforeAll(async () => {
          hashRevenueRule = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'non-matching-merchant',
            pricing_group_id: null,
            percentage: 20000,
            flat: null,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          stubRepositories()

          loggerStub = sinon.spy(logger, 'warn')

          pricing = await new CalculatePricingForTransaction().execute(
            transactionData
          )
        })

        test('generates a warn for each installment for each missing rule in logs', () => {
          expect(
            loggerStub.calledWith(
              'iso-revenue-rule-missing-in-pricing-calculation'
            )
          ).toEqual(true)
          expect(loggerStub.callCount).toEqual(4)
        })

        test('produces a Pricing with details', () => {
          expect(pricing).toEqual({
            transactionId: '1539985',
            splitDetail: expect.any(Array),
            isoRevenueDetail: expect.any(Array),
            hashRevenueDetail: expect.any(Array),
          })
        })

        test('produces a splitDetail with splitAmount for each installment', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 5000000,
              isoRevenueAmount: 0,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 5000000,
              isoRevenueAmount: 0,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 0,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 0,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount for each installment', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 0,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 0,
            },
          ])
        })
      })
    })

    describe('and with an iso-revenue-rule with percentage value', () => {
      beforeAll(() => {
        isoRevenueRule = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 100000,
          use_split_values: true,
          flat: null,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })
      })

      describe('and no matching hash-revenue-rule', () => {
        beforeAll(async () => {
          hashRevenueRule = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: 'non-matching-iso-id',
            merchant_id: null,
            pricing_group_id: null,
            percentage: 3000,
            flat: null,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          stubRepositories()

          loggerStub = sinon.spy(logger, 'warn')

          pricing = await new CalculatePricingForTransaction().execute(
            transactionData
          )
        })

        test('generates a warn for each installment in logs', () => {
          expect(
            loggerStub.calledWith(
              'hash-revenue-rule-missing-in-pricing-calculation'
            )
          ).toEqual(true)
          expect(loggerStub.callCount).toEqual(2)
        })

        test('produces a Pricing with details', () => {
          expect(pricing).toEqual({
            transactionId: '1539985',
            splitDetail: expect.any(Array),
            isoRevenueDetail: expect.any(Array),
            hashRevenueDetail: expect.any(Array),
          })
        })

        test('produces a splitDetail with splitAmount for each installment', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 5000000,
              isoRevenueAmount: 50000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 5000000,
              isoRevenueAmount: 50000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 50000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 50000,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount for each installment', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 0,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 0,
            },
          ])
        })
      })
    })

    describe('and with an iso-revenue-rule that could produce a value greater than the amount', () => {
      beforeAll(() => {
        isoRevenueRule = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: '5cf141b986642840656717f1',
          merchant_id: null,
          pricing_group_id: null,
          percentage: 5000000,
          use_split_values: false,
          flat: 10000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })
      })

      describe('and a hash-revenue-rule with flat value', () => {
        beforeAll(async () => {
          hashRevenueRule = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: '5cf141b986642840656717f1',
            merchant_id: null,
            pricing_group_id: null,
            percentage: null,
            flat: 3000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          stubRepositories()

          pricing = await new CalculatePricingForTransaction().execute(
            transactionData
          )
        })

        test('produces a Pricing with detail', () => {
          expect(pricing).toEqual({
            transactionId: '1539985',
            splitDetail: expect.any(Array),
            isoRevenueDetail: expect.any(Array),
            hashRevenueDetail: expect.any(Array),
          })
        })

        test('produces a splitDetail with isoRevenueAmount equals than the split amount', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 5000000,
              isoRevenueAmount: 5000000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 5000000,
              isoRevenueAmount: 5000000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount equals than the split amount', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 5000000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 5000000,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 3000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 3000,
            },
          ])
        })
      })
    })

    // 1 split
    describe('and with an iso-revenue-rule that could produce a negative amount', () => {
      beforeAll(() => {
        isoRevenueRule = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: '5cf141b986642840656717f1',
          merchant_id: null,
          pricing_group_id: null,
          percentage: null,
          use_split_values: true,
          flat: -10000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })
      })

      describe('and a hash-revenue-rule with a flat value', () => {
        beforeAll(async () => {
          hashRevenueRule = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: '5cf141b986642840656717f1',
            merchant_id: null,
            pricing_group_id: null,
            percentage: null,
            flat: 3000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          stubRepositories()

          pricing = await new CalculatePricingForTransaction().execute(
            transactionData
          )
        })

        test('produces a Pricing with detail', () => {
          expect(pricing).toEqual({
            transactionId: '1539985',
            splitDetail: expect.any(Array),
            isoRevenueDetail: expect.any(Array),
            hashRevenueDetail: expect.any(Array),
          })
        })

        test('produces a splitDetail with isoRevenueAmount as zero', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 5000000,
              isoRevenueAmount: 0,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 5000000,
              isoRevenueAmount: 0,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount as zero', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 0,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 0,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 3000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 3000,
            },
          ])
        })
      })
    })
  })
})
