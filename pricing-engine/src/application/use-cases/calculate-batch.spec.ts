import { Pricing } from 'domain/model/pricing'
import { HashRevenueRulesRepository } from 'infrastructure/repository/hash-revenue-rules-repository'
import { IsoRevenueRulesRepository } from 'infrastructure/repository/iso-revenue-rules-repository'
import { SplitRulesRepository } from 'infrastructure/repository/split-rules-repository'
import * as sinon from 'sinon'
import { CalculateBatch } from './calculate-batch'

describe('Given a list with 2 transaction data objects', () => {
  const transactionDatas = [
    {
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
    },
    {
      id: '01FMN657XCPBN601ZRXT8XYT57',
      hashCorrelationKey: '7142eaec-abfd-457d-a8cb-000054415049',
      isoID: '5cf141b986642840656717f1',
      merchantID: '6176e2174ad7d40007d09048',
      merchantCategoryCode: '5912',
      terminalID: '6177ff0a8e5eb6000756ae67',
      authorizerData: {
        name: 'pagseguro',
        uniqueID: '0D7CCD4D-CC95-4217-877A-30F8D7356FFA',
        dateTime: '2021-11-16T17:14:06-03:00',
        responseCode: '00',
        authorizationCode: '499252',
        specificData: {
          affiliationID: '163562222',
        },
      },
      paymentNetworkData: {
        name: 'Elo Cartão de Crédito',
        numericCode: '008',
        alphaCode: 'ECC',
      },
      dateTime: '2021-11-16T17:14:06-03:00',
      transactionType: 'purchase',
      accountType: 'credit',
      approved: true,
      crossBorder: false,
      entryMode: 'icc',
      amount: 3000000,
      currencyCode: '986',
      cardholderData: {
        panFirstDigits: '650516',
        panLastDigits: '1234',
        cardholderName: 'OBI-WAN KENOBI',
        verificationMethod: 'online-pin',
        issuerCountryCode: 'BRA',
      },
      captureChannelData: {
        name: 'hash-pos',
        paymentLinkData: {},
      },
    },
  ]

  beforeAll(() => {
    const isoRevenueRule = IsoRevenueRulesRepository.fromDB({
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

    sinon
      .stub(IsoRevenueRulesRepository, 'findActiveRulesByTarget')
      .resolves([isoRevenueRule])

    sinon.stub(SplitRulesRepository, 'findActiveRulesByTarget').resolves([])

    const hashRevenueRule = HashRevenueRulesRepository.fromDB({
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

    sinon
      .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
      .resolves([hashRevenueRule])
  })

  afterAll(() => {
    sinon.restore()
  })

  describe('when the calculate batch use case is invoked', () => {
    let pricings: Pricing[]

    beforeAll(async () => {
      const calculateBatch = new CalculateBatch()
      pricings = await calculateBatch.execute(transactionDatas)
    })

    test('it should calculate pricings for each transaction data', () => {
      expect(pricings.length).toEqual(2)
    })

    test('it should calculate pricing for the first transaction data', () => {
      const firstPricing = pricings.find((t) => t.transactionId === '1539985')

      expect(firstPricing).toEqual({
        transactionId: '1539985',
        splitDetail: [
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
        ],
        isoRevenueDetail: [
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
        ],
        hashRevenueDetail: [
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
        ],
      })
    })

    test('it should calculate pricing for the second transaction data', () => {
      const secondPricing = pricings.find(
        (t) => t.transactionId === '01FMN657XCPBN601ZRXT8XYT57'
      )

      expect(secondPricing).toEqual({
        transactionId: '01FMN657XCPBN601ZRXT8XYT57',
        splitDetail: [
          {
            merchantId: '6176e2174ad7d40007d09048',
            installmentNumber: 1,
            splitAmount: 3000000,
            isoRevenueAmount: 30000,
          },
        ],
        isoRevenueDetail: [
          {
            merchantId: '6176e2174ad7d40007d09048',
            installmentNumber: 1,
            amount: 30000,
          },
        ],
        hashRevenueDetail: [
          {
            merchantId: '6176e2174ad7d40007d09048',
            installmentNumber: 1,
            amount: 6000,
          },
        ],
      })
    })
  })
})
