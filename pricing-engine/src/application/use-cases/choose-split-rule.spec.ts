import { SplitRule } from 'domain/model/split-rule'
import { Nullable } from 'helpers/types'
import { SplitRulesRepository } from 'infrastructure/repository/split-rules-repository'
import * as sinon from 'sinon'
import { ChooseSplitRule } from './choose-split-rule'

describe('#chooseSplitRule', () => {
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
    let dbRules: SplitRule[]
    let result: Nullable<SplitRule>

    beforeAll(async () => {
      dbRules = [
        SplitRulesRepository.fromDB(
          {
            id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
            iso_id: '5CF141B986642840656717F1',
            merchant_id: null,
            pricing_group_id: null,
            matching_rule: {
              accountType: { $eq: 'credit' },
              transactionType: { $eq: 'purchase' },
              'paymentNetworkData.name': { $eq: 'Visa' },
              'installmentTransactionData.installmentCount': {
                $gte: 2,
                $lte: 6,
              },
            },
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
          [
            {
              id: '2602b87f-74f9-453c-8f68-0ec3a91cc7af',
              split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
              merchant_id: 'MER123123',
              percentage: 7000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
            {
              id: 'bc7df662-0849-4031-b8fa-cd0f081885cc',
              split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
              merchant_id: 'MER999999',
              percentage: 3000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
          ]
        ),
        SplitRulesRepository.fromDB(
          {
            id: '63013625-ea67-42bd-bc97-2a094daacdad',
            iso_id: '5CF141B986642840656717F1',
            merchant_id: null,
            pricing_group_id: null,
            matching_rule: {
              accountType: { $eq: 'credit' },
              transactionType: { $eq: 'purchase' },
              'paymentNetworkData.name': { $eq: 'Visa' },
              'installmentTransactionData.installmentCount': { $gte: 7 },
            },
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
          [
            {
              id: '301366ca-8d3e-4412-8dd3-9481dc1e71b6',
              split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
              merchant_id: 'HAL9000',
              percentage: 4000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
            {
              id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
              split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
              merchant_id: 'THX1138',
              percentage: 6000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
          ]
        ),
      ]

      sinon
        .stub(SplitRulesRepository, 'findActiveRulesByTarget')
        .resolves(dbRules)

      const revenueRule = new ChooseSplitRule()
      result = await revenueRule.execute(
        { isoId: '5CF141B986642840656717F1' },
        transactionData
      )
    })

    test('returns an SplitRule', () => {
      expect(result).toBeInstanceOf(SplitRule)
    })

    test('returns an SplitRule with instructions', () => {
      expect(result?.instructions.length).toEqual(2)
    })
  })

  describe('when more than one rule is applicable', () => {
    let dbRulesSortedByDate: SplitRule[]
    let result: Nullable<SplitRule>

    describe('with two matching iso rules', () => {
      beforeAll(async () => {
        dbRulesSortedByDate = [
          SplitRulesRepository.fromDB(
            {
              id: 'b1040c56-8290-4ec9-9863-2029046f135b',
              iso_id: '5CF141B986642840656717F1',
              merchant_id: null,
              pricing_group_id: null,
              matching_rule: {
                accountType: { $eq: 'credit' },
                transactionType: { $eq: 'purchase' },
                'paymentNetworkData.name': { $eq: 'Visa' },
                'installmentTransactionData.installmentCount': { $gte: 6 },
              },
              created_at: new Date('2021-08-17T14:06:06.322Z'),
              deleted_at: null,
            },
            [
              {
                id: '2602b87f-74f9-453c-8f68-0ec3a91cc7af',
                split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
                merchant_id: 'MER123123',
                percentage: 7000000,
                created_at: new Date('2021-08-17T14:06:06.322Z'),
                deleted_at: null,
              },
              {
                id: 'bc7df662-0849-4031-b8fa-cd0f081885cc',
                split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
                merchant_id: 'MER999999',
                percentage: 3000000,
                created_at: new Date('2021-08-17T14:06:06.322Z'),
                deleted_at: null,
              },
            ]
          ),
          SplitRulesRepository.fromDB(
            {
              id: '63013625-ea67-42bd-bc97-2a094daacdad',
              iso_id: null,
              merchant_id: 'merchant_a',
              pricing_group_id: null,
              matching_rule: {
                accountType: { $eq: 'credit' },
                transactionType: { $eq: 'purchase' },
                'paymentNetworkData.name': { $eq: 'Visa' },
                'installmentTransactionData.installmentCount': { $gte: 7 },
              },
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
            [
              {
                id: '301366ca-8d3e-4412-8dd3-9481dc1e71b6',
                split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
                merchant_id: 'HAL9000',
                percentage: 4000000,
                created_at: new Date('2021-07-30T18:38:10.452Z'),
                deleted_at: null,
              },
              {
                id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
                split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
                merchant_id: 'THX1138',
                percentage: 6000000,
                created_at: new Date('2021-07-30T18:38:10.452Z'),
                deleted_at: null,
              },
            ]
          ),
          SplitRulesRepository.fromDB(
            {
              id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
              iso_id: '5CF141B986642840656717F1',
              merchant_id: null,
              pricing_group_id: null,
              matching_rule: {
                accountType: { $eq: 'credit' },
                transactionType: { $eq: 'purchase' },
                'paymentNetworkData.name': { $eq: 'Visa' },
                'installmentTransactionData.installmentCount': { $gte: 6 },
              },
              created_at: new Date('2021-04-13T11:15:46.512Z'),
              deleted_at: null,
            },
            [
              {
                id: '2602b87f-74f9-453c-8f68-0ec3a91cc7af',
                split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
                merchant_id: 'MER123123',
                percentage: 7000000,
                created_at: new Date('2021-04-13T11:15:46.512Z'),
                deleted_at: null,
              },
              {
                id: 'bc7df662-0849-4031-b8fa-cd0f081885cc',
                split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
                merchant_id: 'MER999999',
                percentage: 3000000,
                created_at: new Date('2021-04-13T11:15:46.512Z'),
                deleted_at: null,
              },
            ]
          ),
        ]

        sinon
          .stub(SplitRulesRepository, 'findActiveRulesByTarget')
          .resolves(dbRulesSortedByDate)

        const revenueRule = new ChooseSplitRule()
        result = await revenueRule.execute(
          { isoId: '5CF141B986642840656717F1', merchantId: 'merchant_b' },
          transactionData
        )
      })

      test('returns a SplitRule', () => {
        expect(result).toBeInstanceOf(SplitRule)
      })

      test('returns the newest rule for the target', () => {
        expect(result?.id).toEqual('b1040c56-8290-4ec9-9863-2029046f135b')
      })
    })

    describe('with one matching iso rule and one matching merchant rule', () => {
      beforeAll(async () => {
        dbRulesSortedByDate = [
          SplitRulesRepository.fromDB(
            {
              id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
              iso_id: '5CF141B986642840656717F1',
              merchant_id: null,
              pricing_group_id: null,
              matching_rule: {
                accountType: { $eq: 'credit' },
                transactionType: { $eq: 'purchase' },
                'paymentNetworkData.name': { $eq: 'Visa' },
                'installmentTransactionData.installmentCount': { $gte: 6 },
              },
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
            [
              {
                id: '2602b87f-74f9-453c-8f68-0ec3a91cc7af',
                split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
                merchant_id: 'MER123123',
                percentage: 7000000,
                created_at: new Date('2021-07-30T18:38:10.452Z'),
                deleted_at: null,
              },
              {
                id: 'bc7df662-0849-4031-b8fa-cd0f081885cc',
                split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
                merchant_id: 'MER999999',
                percentage: 3000000,
                created_at: new Date('2021-07-30T18:38:10.452Z'),
                deleted_at: null,
              },
            ]
          ),
          SplitRulesRepository.fromDB(
            {
              id: '63013625-ea67-42bd-bc97-2a094daacdad',
              iso_id: null,
              merchant_id: 'merchant_a',
              pricing_group_id: null,
              matching_rule: {
                accountType: { $eq: 'credit' },
                transactionType: { $eq: 'purchase' },
                'paymentNetworkData.name': { $eq: 'Visa' },
                'installmentTransactionData.installmentCount': { $gte: 7 },
              },
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
            [
              {
                id: '301366ca-8d3e-4412-8dd3-9481dc1e71b6',
                split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
                merchant_id: 'HAL9000',
                percentage: 4000000,
                created_at: new Date('2021-07-30T18:38:10.452Z'),
                deleted_at: null,
              },
              {
                id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
                split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
                merchant_id: 'THX1138',
                percentage: 6000000,
                created_at: new Date('2021-07-30T18:38:10.452Z'),
                deleted_at: null,
              },
            ]
          ),
        ]

        sinon
          .stub(SplitRulesRepository, 'findActiveRulesByTarget')
          .resolves(dbRulesSortedByDate)

        const revenueRule = new ChooseSplitRule()
        result = await revenueRule.execute(
          { isoId: '5CF141B986642840656717F1', merchantId: 'merchant_a' },
          transactionData
        )
      })

      test('returns a SplitRule', () => {
        expect(result).toBeInstanceOf(SplitRule)
      })

      test('returns the most specific rule for the target', () => {
        expect(result?.id).toEqual('63013625-ea67-42bd-bc97-2a094daacdad')
      })
    })
  })

  describe('when no rule is matched in query', () => {
    let dbRules: SplitRule[]
    let result: Nullable<SplitRule>

    beforeAll(async () => {
      dbRules = []

      sinon
        .stub(SplitRulesRepository, 'findActiveRulesByTarget')
        .resolves(dbRules)

      const revenueRule = new ChooseSplitRule()
      result = await revenueRule.execute(
        { isoId: '5CF141B986642840656717F1' },
        transactionData
      )
    })

    test('returns nothing', () => {
      expect(result).toEqual(null)
    })
  })

  describe('when more than one rule is matched in query but none are applicable', () => {
    let dbRules: SplitRule[]
    let result: Nullable<SplitRule>

    beforeAll(async () => {
      dbRules = [
        SplitRulesRepository.fromDB(
          {
            id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
            iso_id: '5CF141B986642840656717F1',
            merchant_id: null,
            pricing_group_id: null,
            matching_rule: {
              accountType: { $eq: 'debit' },
              transactionType: { $eq: 'purchase' },
              'paymentNetworkData.name': { $eq: 'Visa' },
              'installmentTransactionData.installmentCount': { $gte: 6 },
            },
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
          [
            {
              id: '2602b87f-74f9-453c-8f68-0ec3a91cc7af',
              split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
              merchant_id: 'MER123123',
              percentage: 7000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
            {
              id: 'bc7df662-0849-4031-b8fa-cd0f081885cc',
              split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
              merchant_id: 'MER999999',
              percentage: 3000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
          ]
        ),
        SplitRulesRepository.fromDB(
          {
            id: '63013625-ea67-42bd-bc97-2a094daacdad',
            iso_id: '5CF141B986642840656717F1',
            merchant_id: null,
            pricing_group_id: null,
            matching_rule: {
              accountType: { $eq: 'debit' },
              transactionType: { $eq: 'purchase' },
              'paymentNetworkData.name': { $eq: 'Visa' },
              'installmentTransactionData.installmentCount': { $gte: 7 },
            },
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
          [
            {
              id: '301366ca-8d3e-4412-8dd3-9481dc1e71b6',
              split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
              merchant_id: 'HAL9000',
              percentage: 4000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
            {
              id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
              split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
              merchant_id: 'THX1138',
              percentage: 6000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
          ]
        ),
      ]

      sinon
        .stub(SplitRulesRepository, 'findActiveRulesByTarget')
        .resolves(dbRules)

      const revenueRule = new ChooseSplitRule()
      result = await revenueRule.execute(
        { isoId: '5CF141B986642840656717F1' },
        transactionData
      )
    })

    test('returns nothing', () => {
      expect(result).toEqual(null)
    })
  })
})
