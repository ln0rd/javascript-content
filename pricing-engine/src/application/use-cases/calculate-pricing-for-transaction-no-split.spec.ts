import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { IsoRevenueRule } from 'domain/model/iso-revenue-rule'
import { Pricing } from 'domain/model/pricing'
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

  let isoRevenueRule: IsoRevenueRule
  let hashRevenueRule: HashRevenueRule

  let pricing: Pricing

  afterEach(() => {
    sinon.restore()
  })

  const stubRepositories = () => {
    sinon.stub(SplitRulesRepository, 'findActiveRulesByTarget').resolves([])

    sinon
      .stub(IsoRevenueRulesRepository, 'findActiveRulesByTarget')
      .resolves([isoRevenueRule])

    sinon
      .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
      .resolves([hashRevenueRule])
  }

  describe('when there is no split rule', () => {
    describe('and an iso-revenue-rule has a percentage value', () => {
      beforeAll(() => {
        isoRevenueRule = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: '5cf141b986642840656717f1',
          merchant_id: null,
          pricing_group_id: null,
          percentage: 100000,
          use_split_values: true,
          flat: null,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })
      })

      describe('and with a hash-revenue-rule has a percentage value', () => {
        beforeAll(async () => {
          hashRevenueRule = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: '5cf141b986642840656717f1',
            merchant_id: null,
            pricing_group_id: null,
            percentage: 20000,
            flat: null,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          stubRepositories()

          pricing = await new CalculatePricingForTransaction().execute(
            transactionData
          )
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
    })
  })
})
