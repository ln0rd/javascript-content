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
      { isoId: '5cf141b986642840656717f1', merchantId: 'merchant_a' },
      new Date(transactionData.dateTime),
    ]

    const repositoryArgsForSecondSplit: [TargetRuleIdentifier, Date] = [
      { isoId: '5cf141b986642840656717f1', merchantId: 'merchant_b' },
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

  describe('and a split rule with 2 instructions', () => {
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
            percentage: 7000000,
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
          {
            id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
            split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
            merchant_id: 'merchant_b',
            percentage: 3000000,
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
          percentage: 100000,
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
          percentage: 60000,
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
            percentage: 20000,
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
            percentage: 40000,
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

        test('produces a splitDetail with splitAmount for each installment and merchant', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 3500000,
              isoRevenueAmount: 35000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 3500000,
              isoRevenueAmount: 35000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              splitAmount: 1500000,
              isoRevenueAmount: 9000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              splitAmount: 1500000,
              isoRevenueAmount: 9000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 35000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 35000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 9000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 9000,
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
              amount: 6000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 6000,
            },
          ])
        })
      })
    })

    describe('and with iso-revenue-rules with percentage values and useSplitValues defined as false', () => {
      beforeAll(() => {
        isoRevenueRuleForFirstSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 100000,
          use_split_values: false,
          flat: null,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-08-24T17:37:28.723Z'),
          deleted_at: null,
        })

        isoRevenueRuleForSecondSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_b',
          pricing_group_id: null,
          percentage: 50000,
          use_split_values: false,
          flat: null,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-08-24T17:37:28.723Z'),
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
            percentage: 20000,
            flat: null,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-24T17:37:28.723Z'),
            deleted_at: null,
          })

          hashRevenueRuleForSecondSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_b',
            pricing_group_id: null,
            percentage: 40000,
            flat: null,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-24T17:37:28.723Z'),
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

        test('produces a splitDetail with splitAmount for each installment and merchant', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 3500000,
              isoRevenueAmount: 100000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 3500000,
              isoRevenueAmount: 100000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              splitAmount: 1500000,
              isoRevenueAmount: 50000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              splitAmount: 1500000,
              isoRevenueAmount: 50000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 100000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 100000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 50000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 50000,
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
              amount: 6000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 6000,
            },
          ])
        })
      })
    })

    describe('and with iso-revenue-rules with percentage and mixed useSplitValues values', () => {
      beforeAll(() => {
        isoRevenueRuleForFirstSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 100000,
          use_split_values: false,
          flat: 9000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })

        isoRevenueRuleForSecondSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_b',
          pricing_group_id: null,
          percentage: 50000,
          use_split_values: true,
          flat: 3500,
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
            percentage: 20000,
            flat: 7000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          hashRevenueRuleForSecondSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_b',
            pricing_group_id: null,
            percentage: 40000,
            flat: 5000,
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

        test('produces a splitDetail with splitAmount for each installment and merchant', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 3500000,
              isoRevenueAmount: 109000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 3500000,
              isoRevenueAmount: 109000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              splitAmount: 1500000,
              isoRevenueAmount: 11000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              splitAmount: 1500000,
              isoRevenueAmount: 11000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 109000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 109000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 11000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 11000,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 14000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 14000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 11000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 11000,
            },
          ])
        })
      })
    })

    describe('and with iso-revenue-rules with flat values and useSplitValues defined as false', () => {
      beforeAll(() => {
        isoRevenueRuleForFirstSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: null,
          use_split_values: false,
          flat: 9000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-08-24T17:37:28.723Z'),
          deleted_at: null,
        })

        isoRevenueRuleForSecondSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_b',
          pricing_group_id: null,
          percentage: null,
          use_split_values: false,
          flat: 4000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-08-24T17:37:28.723Z'),
          deleted_at: null,
        })
      })

      describe('and with hash-revenue-rules with flat values', () => {
        beforeAll(async () => {
          hashRevenueRuleForFirstSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: null,
            flat: 7000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-24T17:37:28.723Z'),
            deleted_at: null,
          })

          hashRevenueRuleForSecondSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_b',
            pricing_group_id: null,
            percentage: null,
            flat: 5000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-24T17:37:28.723Z'),
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

        test('produces a splitDetail with splitAmount for each installment and merchant', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 3500000,
              isoRevenueAmount: 9000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 3500000,
              isoRevenueAmount: 9000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              splitAmount: 1500000,
              isoRevenueAmount: 4000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              splitAmount: 1500000,
              isoRevenueAmount: 4000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 9000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 9000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 4000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 4000,
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
              amount: 5000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 5000,
            },
          ])
        })
      })
    })

    describe('and with iso-revenue-rules with both percentage and flat values and useSplitValues defined as false', () => {
      beforeAll(() => {
        isoRevenueRuleForFirstSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 100000,
          use_split_values: false,
          flat: 9000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-08-24T17:37:28.723Z'),
          deleted_at: null,
        })

        isoRevenueRuleForSecondSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_b',
          pricing_group_id: null,
          percentage: 60000,
          use_split_values: false,
          flat: 4000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-08-24T17:37:28.723Z'),
          deleted_at: null,
        })
      })

      describe('and with hash-revenue-rules with both percentage and values', () => {
        beforeAll(async () => {
          hashRevenueRuleForFirstSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: 20000,
            flat: 7000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-24T17:37:28.723Z'),
            deleted_at: null,
          })

          hashRevenueRuleForSecondSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_b',
            pricing_group_id: null,
            percentage: 40000,
            flat: 5000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-24T17:37:28.723Z'),
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

        test('produces a splitDetail with splitAmount for each installment and merchant', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 3500000,
              isoRevenueAmount: 109000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 3500000,
              isoRevenueAmount: 109000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              splitAmount: 1500000,
              isoRevenueAmount: 64000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              splitAmount: 1500000,
              isoRevenueAmount: 64000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 109000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 109000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 64000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 64000,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 14000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 14000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 11000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 11000,
            },
          ])
        })
      })
    })

    describe('and with iso-revenue-rules with flat values', () => {
      beforeAll(() => {
        isoRevenueRuleForFirstSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: null,
          use_split_values: true,
          flat: 9000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })

        isoRevenueRuleForSecondSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_b',
          pricing_group_id: null,
          percentage: null,
          use_split_values: true,
          flat: 4000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })
      })
      describe('and with hash-revenue-rules with flat values', () => {
        beforeAll(async () => {
          hashRevenueRuleForFirstSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: null,
            flat: 7000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          hashRevenueRuleForSecondSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_b',
            pricing_group_id: null,
            percentage: null,
            flat: 5000,
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

        test('produces a splitDetail with splitAmount for each installment and merchant', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 3500000,
              isoRevenueAmount: 9000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 3500000,
              isoRevenueAmount: 9000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              splitAmount: 1500000,
              isoRevenueAmount: 4000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              splitAmount: 1500000,
              isoRevenueAmount: 4000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 9000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 9000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 4000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 4000,
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
              amount: 5000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 5000,
            },
          ])
        })
      })
    })

    describe('and with iso-revenue-rules with both percentage and flat values', () => {
      beforeAll(() => {
        isoRevenueRuleForFirstSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 100000,
          use_split_values: true,
          flat: 9000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })

        isoRevenueRuleForSecondSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_b',
          pricing_group_id: null,
          percentage: 60000,
          use_split_values: true,
          flat: 4000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })
      })

      describe('and with hash-revenue-rules with both percentage and flat values', () => {
        beforeAll(async () => {
          hashRevenueRuleForFirstSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: 20000,
            flat: 7000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          hashRevenueRuleForSecondSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_b',
            pricing_group_id: null,
            percentage: 40000,
            flat: 5000,
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

        test('produces a splitDetail with splitAmount for each installment and merchant', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 3500000,
              isoRevenueAmount: 44000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 3500000,
              isoRevenueAmount: 44000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              splitAmount: 1500000,
              isoRevenueAmount: 13000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              splitAmount: 1500000,
              isoRevenueAmount: 13000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 44000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 44000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 13000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 13000,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 14000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 14000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 11000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 11000,
            },
          ])
        })
      })
    })

    describe('and there is a matching iso-revenue-rule for only one merchant', () => {
      beforeAll(() => {
        isoRevenueRuleForFirstSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'non-matching-merchant',
          pricing_group_id: null,
          percentage: 100000,
          use_split_values: true,
          flat: 9000,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })

        isoRevenueRuleForSecondSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_b',
          pricing_group_id: null,
          percentage: 50000,
          use_split_values: true,
          flat: 3500,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })
      })

      describe('with a hash-revenue-rule with both percentage and flat', () => {
        beforeAll(async () => {
          hashRevenueRuleForFirstSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: 20000,
            flat: 7000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          })

          hashRevenueRuleForSecondSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_b',
            pricing_group_id: null,
            percentage: 40000,
            flat: 5000,
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

        test('produces an isoRevenueDetail with zero as amount for the missing rule for each installment and merchant', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 3500000,
              isoRevenueAmount: 0,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 3500000,
              isoRevenueAmount: 0,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              splitAmount: 1500000,
              isoRevenueAmount: 11000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              splitAmount: 1500000,
              isoRevenueAmount: 11000,
            },
          ])
        })

        test('produces an isoRevenueDetail with zero as amount for the missing rule for each installment', () => {
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
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 11000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 11000,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount for each installment and merchant', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 14000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 14000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 11000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 11000,
            },
          ])
        })
      })
    })

    describe('when iso-revenue-rules has percentage with leftovers in cents', () => {
      beforeAll(() => {
        isoRevenueRuleForFirstSplit = IsoRevenueRulesRepository.fromDB({
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 117931,
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
          percentage: 97349,
          use_split_values: true,
          flat: null,
          matching_rule: { accountType: { $eq: 'credit' } },
          created_at: new Date('2021-07-14T22:25:31.512Z'),
          deleted_at: null,
        })
      })

      describe('and hash-revenue-rules has percentage with leftovers in cents', () => {
        beforeAll(async () => {
          hashRevenueRuleForFirstSplit = HashRevenueRulesRepository.fromDB({
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: 25129,
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
            percentage: 41871,
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

        test('produces a Pricing with detail', () => {
          expect(pricing).toEqual({
            transactionId: '1539985',
            splitDetail: expect.any(Array),
            isoRevenueDetail: expect.any(Array),
            hashRevenueDetail: expect.any(Array),
          })
        })

        test('produces a splitDetail with isoRevenueAmount rounded up', () => {
          expect(pricing.splitDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              splitAmount: 3500000,
              isoRevenueAmount: 42000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              splitAmount: 3500000,
              isoRevenueAmount: 42000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              splitAmount: 1500000,
              isoRevenueAmount: 15000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              splitAmount: 1500000,
              isoRevenueAmount: 15000,
            },
          ])
        })

        test('produces an isoRevenueDetail with amount rounded up', () => {
          expect(pricing.isoRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 42000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 42000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 15000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 15000,
            },
          ])
        })

        test('produces a hashRevenueDetail with amount rounded down', () => {
          expect(pricing.hashRevenueDetail).toEqual([
            {
              merchantId: 'merchant_a',
              installmentNumber: 1,
              amount: 8000,
            },
            {
              merchantId: 'merchant_a',
              installmentNumber: 2,
              amount: 8000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 1,
              amount: 6000,
            },
            {
              merchantId: 'merchant_b',
              installmentNumber: 2,
              amount: 6000,
            },
          ])
        })
      })
    })
  })
})
