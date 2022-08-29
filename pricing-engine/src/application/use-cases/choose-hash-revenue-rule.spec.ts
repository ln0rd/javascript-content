import { expect } from 'chai'
import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { Nullable } from 'helpers/types'
import { HashRevenueRulesRepository } from 'infrastructure/repository/hash-revenue-rules-repository'
import * as sinon from 'sinon'
import { ChooseHashRevenueRule } from './choose-hash-revenue-rule'

describe('#chooseHashRevenueRule', () => {
  afterEach(() => {
    sinon.restore()
  })

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
    amount: 12000,
    currencyCode: '986',
    installmentTransactionData: {
      installmentCount: 10,
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

  describe('when a single rule is applicable', () => {
    let dbRules: HashRevenueRule[]
    let result: Nullable<HashRevenueRule>

    beforeAll(async () => {
      dbRules = [
        {
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 125000,
          flat: null,
          matching_rule: {
            accountType: { $eq: 'credit' },
            transactionType: { $eq: 'purchase' },
            'paymentNetworkData.name': { $eq: 'Visa' },
            'installmentTransactionData.installmentCount': { $eq: 1 },
          },
          created_at: new Date('2021-05-04T19:56:04.322Z'),
          deleted_at: null,
        },
        {
          id: 'c8eb7cf9-e22a-4275-874b-2eb5d9d38521',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 150000,
          flat: null,
          matching_rule: {
            accountType: { $eq: 'credit' },
            transactionType: { $eq: 'purchase' },
            'paymentNetworkData.name': { $eq: 'Visa' },
            'installmentTransactionData.installmentCount': { $gte: 2, $lte: 6 },
          },
          created_at: new Date('2021-05-04T19:56:04.322Z'),
          deleted_at: null,
        },
        {
          id: 'b53d99be-cf94-483b-84ae-2d8a89036dde',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 165000,
          flat: null,
          matching_rule: {
            accountType: { $eq: 'credit' },
            transactionType: { $eq: 'purchase' },
            'paymentNetworkData.name': { $eq: 'Visa' },
            'installmentTransactionData.installmentCount': { $gte: 7 },
          },
          created_at: new Date('2021-05-04T19:56:04.322Z'),
          deleted_at: null,
        },
      ].map((r) => HashRevenueRulesRepository.fromDB(r))

      sinon
        .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
        .resolves(dbRules)

      const revenueRule = new ChooseHashRevenueRule()
      result = await revenueRule.execute(
        { merchantId: 'merchant_a' },
        transactionData
      )
    })

    test('returns a HashRevenueRule', () => {
      expect(result).to.be.an.instanceOf(HashRevenueRule)
    })

    test('returns a HashRevenueRule with a flat or a percentage value', () => {
      expect(result).to.satisfy(
        () => !(result?.flat == null && result?.percentage == null)
      )
    })
  })

  describe('when more than one rule is applicable', () => {
    let dbRulesSortedByDate: HashRevenueRule[]
    let result: Nullable<HashRevenueRule>

    describe('with two matching iso rules', () => {
      beforeAll(async () => {
        dbRulesSortedByDate = [
          {
            id: 'b1040c56-8290-4ec9-9863-2029046f135b',
            iso_id: '5cf141b986642840656717f1',
            merchant_id: null,
            pricing_group_id: null,
            percentage: 175000,
            flat: null,
            matching_rule: {
              accountType: { $eq: 'credit' },
              transactionType: { $eq: 'purchase' },
              'paymentNetworkData.name': { $eq: 'Visa' },
              'installmentTransactionData.installmentCount': { $gte: 6 },
            },
            created_at: new Date('2021-08-17T14:06:06.322Z'),
            deleted_at: null,
          },
          {
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: 165000,
            flat: null,
            matching_rule: {
              accountType: { $eq: 'credit' },
              transactionType: { $eq: 'purchase' },
              'paymentNetworkData.name': { $eq: 'Visa' },
              'installmentTransactionData.installmentCount': { $gte: 7 },
            },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          },
          {
            id: 'c8eb7cf9-e22a-4275-874b-2eb5d9d38521',
            iso_id: '5cf141b986642840656717f1',
            merchant_id: null,
            pricing_group_id: null,
            percentage: 155000,
            flat: null,
            matching_rule: {
              accountType: { $eq: 'credit' },
              transactionType: { $eq: 'purchase' },
              'paymentNetworkData.name': { $eq: 'Visa' },
              'installmentTransactionData.installmentCount': { $gte: 6 },
            },
            created_at: new Date('2021-01-01T19:54:04.322Z'),
            deleted_at: null,
          },
        ].map((r) => HashRevenueRulesRepository.fromDB(r))

        sinon
          .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
          .resolves(dbRulesSortedByDate)

        const revenueRule = new ChooseHashRevenueRule()
        result = await revenueRule.execute(
          { isoId: '5cf141b986642840656717f1', merchantId: 'merchant_b' },
          transactionData
        )
      })

      test('returns a HashRevenueRule', () => {
        expect(result).to.be.an.instanceOf(HashRevenueRule)
      })

      test('returns the newest rule for the target', () => {
        expect(result?.id).to.be.equal('b1040c56-8290-4ec9-9863-2029046f135b')
      })
    })

    describe('with one matching iso rule and one matching merchant rule', () => {
      beforeAll(async () => {
        dbRulesSortedByDate = [
          {
            id: '4969b255-d742-4e57-9cfa-715466bcf816',
            iso_id: null,
            merchant_id: 'merchant_a',
            pricing_group_id: null,
            percentage: 165000,
            flat: null,
            matching_rule: {
              accountType: { $eq: 'credit' },
              transactionType: { $eq: 'purchase' },
              'paymentNetworkData.name': { $eq: 'Visa' },
              'installmentTransactionData.installmentCount': { $gte: 7 },
            },
            created_at: new Date('2021-05-04T19:56:04.322Z'),
            deleted_at: null,
          },
          {
            id: 'c8eb7cf9-e22a-4275-874b-2eb5d9d38521',
            iso_id: '5cf141b986642840656717f1',
            merchant_id: null,
            pricing_group_id: null,
            percentage: 155000,
            flat: null,
            matching_rule: {
              accountType: { $eq: 'credit' },
              transactionType: { $eq: 'purchase' },
              'paymentNetworkData.name': { $eq: 'Visa' },
              'installmentTransactionData.installmentCount': { $gte: 6 },
            },
            created_at: new Date('2021-01-01T19:54:04.322Z'),
            deleted_at: null,
          },
        ].map((r) => HashRevenueRulesRepository.fromDB(r))

        sinon
          .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
          .resolves(dbRulesSortedByDate)

        const revenueRule = new ChooseHashRevenueRule()
        result = await revenueRule.execute(
          { isoId: '5cf141b986642840656717f1', merchantId: 'merchant_a' },
          transactionData
        )
      })

      test('returns a HashRevenueRule', () => {
        expect(result).to.be.an.instanceOf(HashRevenueRule)
      })

      test('returns the most specific rule for the target', () => {
        expect(result?.id).to.be.equal('4969b255-d742-4e57-9cfa-715466bcf816')
      })
    })
  })

  describe('when no rule is matched in query', () => {
    let dbRules: HashRevenueRule[]
    let result: Nullable<HashRevenueRule>

    beforeAll(async () => {
      dbRules = []

      sinon
        .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
        .resolves(dbRules)

      const revenueRule = new ChooseHashRevenueRule()
      result = await revenueRule.execute(
        { merchantId: 'merchant_a' },
        transactionData
      )
    })

    test('returns nothing', () => {
      expect(result).to.equal(null)
    })
  })

  describe('when more than one rule is matched in query but none are applicable', () => {
    let dbRules: HashRevenueRule[]
    let result: Nullable<HashRevenueRule>

    beforeAll(async () => {
      dbRules = [
        {
          id: '5d77f127-2be6-4566-973e-1128eeb2d010',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 155000,
          flat: null,
          matching_rule: {
            accountType: { $eq: 'debit' },
            transactionType: { $eq: 'purchase' },
            'paymentNetworkData.name': { $eq: 'Visa' },
            'installmentTransactionData.installmentCount': { $gte: 6 },
          },
          created_at: new Date('2021-01-01T19:54:04.322Z'),
          deleted_at: null,
        },
        {
          id: '4969b255-d742-4e57-9cfa-715466bcf816',
          iso_id: null,
          merchant_id: 'merchant_a',
          pricing_group_id: null,
          percentage: 165000,
          flat: null,
          matching_rule: {
            accountType: { $eq: 'debit' },
            transactionType: { $eq: 'purchase' },
            'paymentNetworkData.name': { $eq: 'Visa' },
            'installmentTransactionData.installmentCount': { $gte: 7 },
          },
          created_at: new Date('2021-05-04T19:56:04.322Z'),
          deleted_at: null,
        },
      ].map((r) => HashRevenueRulesRepository.fromDB(r))

      sinon
        .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
        .resolves(dbRules)

      const revenueRule = new ChooseHashRevenueRule()
      result = await revenueRule.execute(
        { merchantId: 'merchant_a' },
        transactionData
      )
    })

    test('returns nothing', () => {
      expect(result).to.equal(null)
    })
  })
})
