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
    amount: 9727000,
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
  let isoRevenueRuleForFirstSplit: IsoRevenueRule
  let isoRevenueRuleForSecondSplit: IsoRevenueRule
  let isoRevenueRuleForThirdSplit: IsoRevenueRule
  let hashRevenueRuleForFirstSplit: HashRevenueRule
  let hashRevenueRuleForSecondSplit: HashRevenueRule
  let hashRevenueRuleForThirdSplit: HashRevenueRule

  let pricing: Pricing

  afterEach(() => {
    sinon.restore()
  })

  const stubRepositories = () => {
    const repositoryArgsForFirstSplit: [TargetRuleIdentifier, Date] = [
      { isoId: '5cf141b986642840656717f1', merchantId: 'merchant_a' },
      new Date(transactionData.dateTime),
    ]

    const repositoryArgsForSecondSplit: [TargetRuleIdentifier, Date] = [
      { isoId: '5cf141b986642840656717f1', merchantId: 'merchant_b' },
      new Date(transactionData.dateTime),
    ]

    const repositoryArgsForThirdSplit: [TargetRuleIdentifier, Date] = [
      { isoId: '5cf141b986642840656717f1', merchantId: 'merchant_c' },
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
      .withArgs(...repositoryArgsForThirdSplit)
      .resolves([isoRevenueRuleForThirdSplit])

    sinon
      .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
      .withArgs(...repositoryArgsForFirstSplit)
      .resolves([hashRevenueRuleForFirstSplit])
      .withArgs(...repositoryArgsForSecondSplit)
      .resolves([hashRevenueRuleForSecondSplit])
      .withArgs(...repositoryArgsForThirdSplit)
      .resolves([hashRevenueRuleForThirdSplit])
  }

  describe('and a split rule that generate amounts with leftover in cents', () => {
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
            percentage: 1723000,
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
          {
            id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
            split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
            merchant_id: 'merchant_b',
            percentage: 3251000,
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
          {
            id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
            split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
            merchant_id: 'merchant_c',
            percentage: 5026000,
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
          percentage: 137000,
          use_split_values: true,
          flat: null,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })

        isoRevenueRuleForSecondSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_b',
          pricing_group_id: null,
          percentage: 119000,
          use_split_values: true,
          flat: null,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })

        isoRevenueRuleForThirdSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_c',
          pricing_group_id: null,
          percentage: 177000,
          use_split_values: true,
          flat: null,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })
      })

      describe('and with hash-revenue-rules with percentage values', () => {
        beforeAll(async () => {
          hashRevenueRuleForFirstSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: 91000,
            flat: null,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          hashRevenueRuleForSecondSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_b',
            pricing_group_id: null,
            percentage: 316000,
            flat: null,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          hashRevenueRuleForThirdSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_c',
            pricing_group_id: null,
            percentage: 13000,
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

        test('produces a splitDetail with split leftovers added to the first merchant', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 838000,
              isoRevenueAmount: 12000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 839000,
              isoRevenueAmount: 12000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              splitAmount: 1581000,
              isoRevenueAmount: 19000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              splitAmount: 1581000,
              isoRevenueAmount: 19000,
            },
            {
              merchantId: 'merchant_c',
              installmentNumber: 1,
              splitAmount: 2444000,
              isoRevenueAmount: 44000,
            },
            {
              merchantId: 'merchant_c',
              installmentNumber: 2,
              splitAmount: 2444000,
              isoRevenueAmount: 44000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 12000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 12000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 19000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 19000,
            },
            {
              merchantId: 'merchant_c',
              installmentNumber: 1,
              amount: 44000,
            },
            {
              merchantId: 'merchant_c',
              installmentNumber: 2,
              amount: 44000,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 7000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 7000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 49000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 49000,
            },
            {
              merchantId: 'merchant_c',
              installmentNumber: 1,
              amount: 3000,
            },
            {
              merchantId: 'merchant_c',
              installmentNumber: 2,
              amount: 3000,
            },
          ])
        })

        test('the sum of splitAmounts should be equal to the transaction amount', () => {
          const total = pricing.splitDetail.reduce(
            (sum, splitDetail) => sum + splitDetail.splitAmount,
            0
          )
          expect(total).toEqual(transactionData.amount)
        })
      })
    })
  })
})
