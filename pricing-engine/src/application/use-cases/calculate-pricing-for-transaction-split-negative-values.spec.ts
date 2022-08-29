import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { IsoRevenueRule } from 'domain/model/iso-revenue-rule'
import { Pricing } from 'domain/model/pricing'
import { SplitRule } from 'domain/model/split-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { HashRevenueRulesRepository } from 'infrastructure/repository/hash-revenue-rules-repository'
import { IsoRevenueRulesRepository } from 'infrastructure/repository/iso-revenue-rules-repository'
import { SplitRulesRepository } from 'infrastructure/repository/split-rules-repository'
import * as sinon from 'sinon'
import { CalculatePricingForTransaction } from './calculate-pricing-for-transaction'

describe.each(['purchase-reversal', 'chargeback'])(
  'Given a transaction with transactionType defined as %p',
  (transactionType: string) => {
    const transactionData = {
      id: '1539985',
      hashCorrelationKey: '2501ed2d-c41a-427a-b7f3-40c97d69c7e2',
      isoID: 'b13f146c284d1645e71067f1',
      merchantID: 'merchant_a',
      merchantCategoryCode: '1234',
      terminalID: '1539985',
      authorizerData: {
        name: 'Pagseguro',
        uniqueID: '22781384615723',
        dateTime: '2021-09-08T17:31:23Z',
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
      dateTime: '2021-09-08T17:31:23Z',
      transactionType,
      accountType: 'credit',
      approved: true,
      crossBorder: false,
      entryMode: 'icc',
      amount: 17000000,
      currencyCode: '986',
      installmentTransactionData: {
        installmentCount: 3,
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
    let isoRevenueRuleForFirstSplit: IsoRevenueRule
    let isoRevenueRuleForSecondSplit: IsoRevenueRule
    let hashRevenueRuleForFirstSplit: HashRevenueRule
    let hashRevenueRuleForSecondSplit: HashRevenueRule

    let pricing: Pricing

    afterEach(() => {
      sinon.restore()
    })

    const stubRepositories = () => {
      const repositoryArgsForFirstSplit: [TargetRuleIdentifier, Date] = [
        { isoId: 'b13f146c284d1645e71067f1', merchantId: 'merchant_a' },
        new Date(transactionData.dateTime),
      ]

      const repositoryArgsForSecondSplit: [TargetRuleIdentifier, Date] = [
        { isoId: 'b13f146c284d1645e71067f1', merchantId: 'merchant_b' },
        new Date(transactionData.dateTime),
      ]

      sinon
        .stub(SplitRulesRepository, 'findActiveRulesByTarget')
        .resolves([splitRule])

      sinon
        .stub(IsoRevenueRulesRepository, 'findActiveRulesByTarget')
        .withArgs(...repositoryArgsForFirstSplit)
        .resolves([isoRevenueRuleForFirstSplit])
        .withArgs(...repositoryArgsForSecondSplit)
        .resolves([isoRevenueRuleForSecondSplit])

      sinon
        .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
        .withArgs(...repositoryArgsForFirstSplit)
        .resolves([hashRevenueRuleForFirstSplit])
        .withArgs(...repositoryArgsForSecondSplit)
        .resolves([hashRevenueRuleForSecondSplit])
    }

    describe('and a given split rule', () => {
      beforeAll(() => {
        splitRule = SplitRulesRepository.fromDB(
          {
            id: '63013625-ea67-42bd-bc97-2a094daacdad',
            iso_id: 'b13f146c284d1645e71067f1',
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
              percentage: 6000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
            {
              id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
              split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
              merchant_id: 'merchant_b',
              percentage: 4000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
          ]
        )
      })

      describe('and with iso-revenue-rules with percentage values', () => {
        beforeAll(() => {
          isoRevenueRuleForFirstSplit = IsoRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: 120000,
            use_split_values: true,
            flat: 5000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-07-14T22:25:31.512Z'),
            deleted_at: null,
          })

          isoRevenueRuleForSecondSplit = IsoRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_b',
            pricing_group_id: null,
            percentage: 110000,
            use_split_values: true,
            flat: 0,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-07-14T22:25:31.512Z'),
            deleted_at: null,
          })
        })

        describe('and with hash-revenue-rules with flat and percentage values', () => {
          beforeAll(async () => {
            hashRevenueRuleForFirstSplit = HashRevenueRulesRepository.fromDB({
              id: '4969b255-d742-4e57-9cfa-715466bcf816',
              iso_id: null,
              merchant_id: 'merchant_a',
              pricing_group_id: null,
              percentage: 40000,
              flat: 1000,
              matching_rule: { accountType: { $eq: 'credit' } },
              created_at: new Date('2021-05-04T19:56:04.322Z'),
              deleted_at: null,
            })

            hashRevenueRuleForSecondSplit = HashRevenueRulesRepository.fromDB({
              id: '4969b255-d742-4e57-9cfa-715466bcf816',
              iso_id: null,
              merchant_id: 'merchant_b',
              pricing_group_id: null,
              percentage: 60000,
              flat: 2000,
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

          test('produces a splitDetail with amounts as negative values', () => {
            expect(pricing.splitDetail).toEqual([
              {
                merchantId: 'merchant_a',
                installmentNumber: 1,
                splitAmount: -3400000,
                isoRevenueAmount: -46000,
              },
              {
                merchantId: 'merchant_a',
                installmentNumber: 2,
                splitAmount: -3400000,
                isoRevenueAmount: -46000,
              },
              {
                merchantId: 'merchant_a',
                installmentNumber: 3,
                splitAmount: -3400000,
                isoRevenueAmount: -46000,
              },
              {
                merchantId: 'merchant_b',
                installmentNumber: 1,
                splitAmount: -2266000,
                isoRevenueAmount: -25000,
              },
              {
                merchantId: 'merchant_b',
                installmentNumber: 2,
                splitAmount: -2266000,
                isoRevenueAmount: -25000,
              },
              {
                merchantId: 'merchant_b',
                installmentNumber: 3,
                splitAmount: -2268000,
                isoRevenueAmount: -25000,
              },
            ])
          })

          test('produces an isoRevenueDetail with amounts as negative values', () => {
            expect(pricing.isoRevenueDetail).toEqual([
              {
                merchantId: 'merchant_a',
                installmentNumber: 1,
                amount: -46000,
              },
              {
                merchantId: 'merchant_a',
                installmentNumber: 2,
                amount: -46000,
              },
              {
                merchantId: 'merchant_a',
                installmentNumber: 3,
                amount: -46000,
              },
              {
                merchantId: 'merchant_b',
                installmentNumber: 1,
                amount: -25000,
              },
              {
                merchantId: 'merchant_b',
                installmentNumber: 2,
                amount: -25000,
              },
              {
                merchantId: 'merchant_b',
                installmentNumber: 3,
                amount: -25000,
              },
            ])
          })

          test('produces a hashRevenueDetail with amounts as negative values', () => {
            expect(pricing.hashRevenueDetail).toEqual([
              {
                merchantId: 'merchant_a',
                installmentNumber: 1,
                amount: -14000,
              },
              {
                merchantId: 'merchant_a',
                installmentNumber: 2,
                amount: -14000,
              },
              {
                merchantId: 'merchant_a',
                installmentNumber: 3,
                amount: -14000,
              },
              {
                merchantId: 'merchant_b',
                installmentNumber: 1,
                amount: -15000,
              },
              {
                merchantId: 'merchant_b',
                installmentNumber: 2,
                amount: -15000,
              },
              {
                merchantId: 'merchant_b',
                installmentNumber: 3,
                amount: -15000,
              },
            ])
          })
        })
      })
    })
  }
)
