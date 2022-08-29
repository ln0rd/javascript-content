import * as Hapi from '@hapi/hapi'
import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { IsoRevenueRule } from 'domain/model/iso-revenue-rule'
import { SplitRule } from 'domain/model/split-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { HashRevenueRulesRepository } from 'infrastructure/repository/hash-revenue-rules-repository'
import { IsoRevenueRulesRepository } from 'infrastructure/repository/iso-revenue-rules-repository'
import { SplitRulesRepository } from 'infrastructure/repository/split-rules-repository'
import { init } from 'interfaces/api'
import Sinon = require('sinon')
import sinon = require('sinon')

describe('Testing Calculate Pricing API', () => {
  const transactionData = {
    id: '2601472',
    hashCorrelationKey: '6002ed2d-c21a-229a-b7c3-40f97d69f7d2',
    isoID: '1dc252c886642840666717f1',
    merchantID: 'merchanta',
    merchantCategoryCode: '4321',
    terminalID: '1111111',
    authorizerData: {
      name: 'Pagseguro',
      uniqueID: '22781384615723',
      dateTime: '2021-09-13T11:59:07Z',
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
      installmentCount: 4,
      installmentQualifier: 'issuer',
    },
    cardholderData: {
      panFirstDigits: '516292',
      panLastDigits: '0253',
      cardExpirationDate: '0428',
      verificationMethod: 'offline-pin',
      issuerCountryCode: '076',
    },
    captureChannelData: {
      name: 'hash-pos',
      paymentLinkData: {
        creationTimestamp: '2021-09-03T11:59:05Z',
      },
    },
    antifraudData: {
      name: 'name',
      requestID: '840617f1667',
      flaggedAsSuspicious: true,
    },
  }
  const transactionDataList = [transactionData]

  let server: Hapi.Server

  let splitRule: SplitRule
  let isoRevenueRule: IsoRevenueRule
  let hashRevenueRule: HashRevenueRule
  let hashRevenueRuleStub: Sinon.SinonStub
  let isoRevenueRuleStub: Sinon.SinonStub
  let splitRuleStub: Sinon.SinonStub
  let response: Hapi.ServerInjectResponse
  let responseItem: { [key: string]: any }

  beforeAll(async () => {
    server = await init()
  })

  afterAll(async () => {
    await server.stop()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('Tests with split rule', () => {
    beforeAll(async () => {
      splitRule = SplitRulesRepository.fromDB(
        {
          id: '63013625-ea67-42bd-bc97-2a094daacdad',
          iso_id: '1dc252c886642840666717f1',
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
            merchant_id: 'merchanta',
            percentage: 7000000,
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
          {
            id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
            split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
            merchant_id: 'merchantb',
            percentage: 3000000,
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
        ]
      )

      isoRevenueRule = IsoRevenueRulesRepository.fromDB({
        id: '4969b255-d742-4e57-9cfa-715466bcf816',
        iso_id: null,
        merchant_id: 'merchanta',
        pricing_group_id: null,
        percentage: 100000,
        use_split_values: true,
        flat: null,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: new Date('2021-07-14T22:25:31.512Z'),
        deleted_at: null,
      })

      hashRevenueRule = HashRevenueRulesRepository.fromDB({
        id: '4969b255-d742-4e57-9cfa-715466bcf816',
        iso_id: null,
        merchant_id: 'merchanta',
        pricing_group_id: null,
        percentage: 20000,
        flat: null,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: new Date('2021-05-04T19:56:04.322Z'),
        deleted_at: null,
      })

      splitRuleStub = sinon
        .stub(SplitRulesRepository, 'findActiveRulesByTarget')
        .resolves([splitRule])

      isoRevenueRuleStub = sinon
        .stub(IsoRevenueRulesRepository, 'findActiveRulesByTarget')
        .resolves([isoRevenueRule])

      hashRevenueRuleStub = sinon
        .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
        .resolves([hashRevenueRule])

      response = await server.inject({
        method: 'POST',
        url: '/calculate_pricing',
        payload: transactionDataList,
      })

      const responsePayload = JSON.parse(response.payload)
      responseItem = responsePayload[0]
    })

    test('arguments in HashRevenueRuleRespository', () => {
      const repositoryArgsHashRevenueRule: [TargetRuleIdentifier, Date] = [
        { isoId: '1dc252c886642840666717f1', merchantId: 'merchanta' },
        new Date(transactionData.dateTime),
      ]

      sinon.assert.calledWith(
        hashRevenueRuleStub,
        ...repositoryArgsHashRevenueRule
      )
    })

    test('arguments in IsoRevenueRuleRespository', () => {
      const repositoryArgsIsoRevenueRule: [TargetRuleIdentifier, Date] = [
        { isoId: '1dc252c886642840666717f1', merchantId: 'merchanta' },
        new Date(transactionData.dateTime),
      ]

      sinon.assert.calledWith(
        isoRevenueRuleStub,
        ...repositoryArgsIsoRevenueRule
      )
    })

    test('arguments in SplitRuleRespository', () => {
      const repositoryArgsSplitRevenueRule: [TargetRuleIdentifier, Date] = [
        {
          isoId: '1dc252c886642840666717f1',
          merchantId: 'merchanta',
        },
        new Date(transactionData.dateTime),
      ]

      sinon.assert.calledWith(splitRuleStub, ...repositoryArgsSplitRevenueRule)
    })

    test('status code', () => {
      expect(response.statusCode).toEqual(200)
    })

    test('Provided transaction id', () => {
      expect(responseItem.transactionId).toEqual('2601472')
    })

    test('Split detail expected', () => {
      const expectResponse = [
        {
          merchantId: 'merchanta',
          installmentNumber: 1,
          splitAmount: 1750000,
          isoRevenueAmount: 18000,
        },
        {
          merchantId: 'merchanta',
          installmentNumber: 2,
          splitAmount: 1750000,
          isoRevenueAmount: 18000,
        },
        {
          merchantId: 'merchanta',
          installmentNumber: 3,
          splitAmount: 1750000,
          isoRevenueAmount: 18000,
        },
        {
          merchantId: 'merchanta',
          installmentNumber: 4,
          splitAmount: 1750000,
          isoRevenueAmount: 18000,
        },
        {
          merchantId: 'merchantb',
          installmentNumber: 1,
          splitAmount: 750000,
          isoRevenueAmount: 0,
        },
        {
          merchantId: 'merchantb',
          installmentNumber: 2,
          splitAmount: 750000,
          isoRevenueAmount: 0,
        },
        {
          merchantId: 'merchantb',
          installmentNumber: 3,
          splitAmount: 750000,
          isoRevenueAmount: 0,
        },
        {
          merchantId: 'merchantb',
          installmentNumber: 4,
          splitAmount: 750000,
          isoRevenueAmount: 0,
        },
      ]

      expect(responseItem.splitDetail).toEqual(expectResponse)
    })

    test('iso Revenue Detail', () => {
      const expectResponse = [
        { installmentNumber: 1, merchantId: 'merchanta', amount: 18000 },
        { installmentNumber: 2, merchantId: 'merchanta', amount: 18000 },
        { installmentNumber: 3, merchantId: 'merchanta', amount: 18000 },
        { installmentNumber: 4, merchantId: 'merchanta', amount: 18000 },
        { installmentNumber: 1, merchantId: 'merchantb', amount: 0 },
        { installmentNumber: 2, merchantId: 'merchantb', amount: 0 },
        { installmentNumber: 3, merchantId: 'merchantb', amount: 0 },
        { installmentNumber: 4, merchantId: 'merchantb', amount: 0 },
      ]
      expect(responseItem.isoRevenueDetail).toEqual(expectResponse)
    })

    test('Hash Revenue Detail', () => {
      const expectResponse = [
        { amount: 3000, installmentNumber: 1, merchantId: 'merchanta' },
        { amount: 3000, installmentNumber: 2, merchantId: 'merchanta' },
        { amount: 3000, installmentNumber: 3, merchantId: 'merchanta' },
        { amount: 3000, installmentNumber: 4, merchantId: 'merchanta' },
        { amount: 0, installmentNumber: 1, merchantId: 'merchantb' },
        { amount: 0, installmentNumber: 2, merchantId: 'merchantb' },
        { amount: 0, installmentNumber: 3, merchantId: 'merchantb' },
        { amount: 0, installmentNumber: 4, merchantId: 'merchantb' },
      ]

      expect(responseItem.hashRevenueDetail).toEqual(expectResponse)
    })
  })

  describe('Validation tests', () => {
    beforeEach(() => {
      splitRuleStub = sinon
        .stub(SplitRulesRepository, 'findActiveRulesByTarget')
        .resolves([])

      isoRevenueRuleStub = sinon
        .stub(IsoRevenueRulesRepository, 'findActiveRulesByTarget')
        .resolves([])

      hashRevenueRuleStub = sinon
        .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
        .resolves([])
    })

    afterEach(() => {
      sinon.restore()
    })

    test('request with negative amount', async () => {
      transactionData.amount = -10000000

      response = await server.inject({
        method: 'POST',
        url: '/calculate_pricing',
        payload: transactionDataList,
      })

      responseItem = JSON.parse(response.payload)

      transactionData.amount = 10000000
      expect(responseItem.message).toEqual(
        '"[0].amount" must be a positive number'
      )
      expect(responseItem.statusCode).toEqual(400)
      expect(response.statusCode).toEqual(400)
    })

    test('request with invalid IsoID', async () => {
      transactionData.isoID = ''

      response = await server.inject({
        method: 'POST',
        url: '/calculate_pricing',
        payload: transactionDataList,
      })

      responseItem = JSON.parse(response.payload)

      transactionData.isoID = '1dc252c886642840666717f1'
      expect(responseItem.message).toEqual(
        '"[0].isoID" is not allowed to be empty'
      )
      expect(responseItem.statusCode).toEqual(400)
      expect(response.statusCode).toEqual(400)
    })

    test('request without merchantId', async () => {
      transactionData.merchantID = ''

      response = await server.inject({
        method: 'POST',
        url: '/calculate_pricing',
        payload: transactionDataList,
      })

      responseItem = JSON.parse(response.payload)

      transactionData.merchantID = 'merchanta'
      expect(responseItem.message).toEqual(
        '"[0].merchantID" is not allowed to be empty'
      )
      expect(responseItem.statusCode).toEqual(400)
      expect(response.statusCode).toEqual(400)
    })

    test('request without hashCorrelationKey', async () => {
      transactionData.hashCorrelationKey = ''

      response = await server.inject({
        method: 'POST',
        url: '/calculate_pricing',
        payload: transactionDataList,
      })

      responseItem = JSON.parse(response.payload)

      transactionData.hashCorrelationKey =
        '6002ed2d-c21a-229a-b7c3-40f97d69f7d2'
      expect(responseItem.message).toEqual(
        '"[0].hashCorrelationKey" is not allowed to be empty'
      )
      expect(responseItem.statusCode).toEqual(400)
      expect(response.statusCode).toEqual(400)
    })

    test('request without installments', async () => {
      transactionData.installmentTransactionData.installmentCount = 0

      response = await server.inject({
        method: 'POST',
        url: '/calculate_pricing',
        payload: transactionDataList,
      })

      responseItem = JSON.parse(response.payload)

      transactionData.installmentTransactionData.installmentCount = 4
      expect(responseItem.message).toEqual(
        '"[0].installmentTransactionData.installmentCount" must be a positive number'
      )
      expect(responseItem.statusCode).toEqual(400)
      expect(response.statusCode).toEqual(400)
    })

    const cloneTransactionData = (transform: (cloned: any) => void) => {
      const clone = JSON.parse(JSON.stringify(transactionData))
      transform(clone)
      return clone
    }

    const assertRequest = async (status: number, t: any) => {
      response = await server.inject({
        method: 'POST',
        url: '/calculate_pricing',
        payload: [t],
      })

      expect(response.statusCode).toEqual(status)
    }

    test('missing required objects should be rejected', async () => {
      await assertRequest(
        400,
        cloneTransactionData((clone) => {
          clone.authorizerData = null
        })
      )

      await assertRequest(
        400,
        cloneTransactionData((clone) => {
          clone.paymentNetworkData = null
        })
      )

      await assertRequest(
        400,
        cloneTransactionData((clone) => {
          clone.cardholderData = null
        })
      )
    })

    test('optional property should accept null values', async () => {
      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.terminalID = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.authorizerData.uniqueID = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.authorizerData.dateTime = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.authorizerData.specificData = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.authorizerData.specificData.affiliationID = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.captureChannelData = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.captureChannelData = {
            name: 'name',
            paymentLinkData: null,
          }
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.captureChannelData = {
            name: 'name',
            paymentLinkData: {
              creationTimestamp: null,
            },
          }
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.installmentTransactionData = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.installmentTransactionData.installmentQualifier = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.cardholderData.panSequenceNumber = null
          clone.cardholderData.cardExpirationDate = null
          clone.cardholderData.cardholderName = null
          clone.cardholderData.verificationMethod = null
          clone.cardholderData.issuerCountryCode = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.referenceTransactionId = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.antifraudData = null
        })
      )

      await assertRequest(
        200,
        cloneTransactionData((clone) => {
          clone.antifraudData = {
            name: null,
            requestID: null,
            flaggedAsSuspicious: null,
          }
        })
      )
    })
  })
})
