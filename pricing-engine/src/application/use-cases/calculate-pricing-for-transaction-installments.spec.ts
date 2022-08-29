import { Pricing } from 'domain/model/pricing'
import { HashRevenueRulesRepository } from 'infrastructure/repository/hash-revenue-rules-repository'
import { IsoRevenueRulesRepository } from 'infrastructure/repository/iso-revenue-rules-repository'
import { SplitRulesRepository } from 'infrastructure/repository/split-rules-repository'
import * as sinon from 'sinon'
import { CalculatePricingForTransaction } from './calculate-pricing-for-transaction'

describe.each([
  {
    amount: 7220000,
    installmentCount: 2,
    merchant_a: {
      percentage: 6000000,
      installmentAmount: 2166000,
      roundingDifference: 0,
      total: 4332000,
    },
    merchant_b: {
      percentage: 4000000,
      installmentAmount: 1444000,
      roundingDifference: 0,
      total: 2888000,
    },
  },
  {
    amount: 2120000,
    installmentCount: 2,
    merchant_a: {
      percentage: 6000000,
      installmentAmount: 636000,
      roundingDifference: 0,
      total: 1272000,
    },
    merchant_b: {
      percentage: 4000000,
      installmentAmount: 424000,
      roundingDifference: 0,
      total: 848000,
    },
  },
  {
    amount: 4000000,
    installmentCount: 4,
    merchant_a: {
      percentage: 7000000,
      installmentAmount: 700000,
      roundingDifference: 0,
      total: 2800000,
    },
    merchant_b: {
      percentage: 3000000,
      installmentAmount: 300000,
      roundingDifference: 0,
      total: 1200000,
    },
  },
  {
    amount: 100000,
    installmentCount: 4,
    merchant_a: {
      percentage: 9000000,
      installmentAmount: 22000,
      roundingDifference: 2000,
      total: 90000,
    },
    merchant_b: {
      percentage: 1000000,
      installmentAmount: 2000,
      roundingDifference: 2000,
      total: 10000,
    },
  },
  {
    amount: 500000,
    installmentCount: 4,
    merchant_a: {
      percentage: 8000000,
      installmentAmount: 100000,
      roundingDifference: 0,
      total: 400000,
    },
    merchant_b: {
      percentage: 2000000,
      installmentAmount: 25000,
      roundingDifference: 0,
      total: 100000,
    },
  },
  {
    amount: 1600000,
    installmentCount: 4,
    merchant_a: {
      percentage: 9500000,
      installmentAmount: 380000,
      roundingDifference: 0,
      total: 1520000,
    },
    merchant_b: {
      percentage: 500000,
      installmentAmount: 20000,
      roundingDifference: 0,
      total: 80000,
    },
  },
  {
    amount: 1200000,
    installmentCount: 9,
    merchant_a: {
      percentage: 7000000,
      installmentAmount: 93000,
      roundingDifference: 3000,
      total: 840000,
    },
    merchant_b: {
      percentage: 3000000,
      installmentAmount: 40000,
      roundingDifference: 0,
      total: 360000,
    },
  },
  {
    amount: 13935000,
    installmentCount: 9,
    merchant_a: {
      percentage: 6000000,
      installmentAmount: 929000,
      roundingDifference: 0,
      total: 8361000,
    },
    merchant_b: {
      percentage: 4000000,
      installmentAmount: 619000,
      roundingDifference: 3000,
      total: 5574000,
    },
  },
  {
    amount: 72900000,
    installmentCount: 16,
    merchant_a: {
      percentage: 3100000,
      installmentAmount: 1412000,
      roundingDifference: 7000,
      total: 22599000,
    },
    merchant_b: {
      percentage: 6900000,
      installmentAmount: 3143000,
      roundingDifference: 13000,
      total: 50301000,
    },
  },
  {
    amount: 1501300000,
    installmentCount: 11,
    merchant_a: {
      percentage: 5000000,
      installmentAmount: 68240000,
      roundingDifference: 10000,
      total: 750650000,
    },
    merchant_b: {
      percentage: 5000000,
      installmentAmount: 68240000,
      roundingDifference: 10000,
      total: 750650000,
    },
  },
  {
    amount: 212400000,
    installmentCount: 7,
    merchant_a: {
      percentage: 5000000,
      installmentAmount: 15171000,
      roundingDifference: 3000,
      total: 106200000,
    },
    merchant_b: {
      percentage: 5000000,
      installmentAmount: 15171000,
      roundingDifference: 3000,
      total: 106200000,
    },
  },
  {
    amount: 1300000,
    installmentCount: 11,
    merchant_a: {
      percentage: 5000000,
      installmentAmount: 59000,
      roundingDifference: 1000,
      total: 650000,
    },
    merchant_b: {
      percentage: 5000000,
      installmentAmount: 59000,
      roundingDifference: 1000,
      total: 650000,
    },
  },
  {
    amount: 100000,
    installmentCount: 1,
    merchant_a: {
      percentage: 9900000,
      installmentAmount: 99000,
      roundingDifference: 0,
      total: 99000,
    },
    merchant_b: {
      percentage: 100000,
      installmentAmount: 1000,
      roundingDifference: 0,
      total: 1000,
    },
  },
  {
    amount: 100000,
    installmentCount: 2,
    merchant_a: {
      percentage: 9900000,
      installmentAmount: 49000,
      roundingDifference: 1000,
      total: 99000,
    },
    merchant_b: {
      percentage: 100000,
      installmentAmount: 0,
      roundingDifference: 1000,
      total: 1000,
    },
  },
  {
    amount: 20000000,
    installmentCount: 3,
    merchant_a: {
      percentage: 9000000,
      installmentAmount: 6000000,
      roundingDifference: 0,
      total: 18000000,
    },
    merchant_b: {
      percentage: 1000000,
      installmentAmount: 666000,
      roundingDifference: 2000,
      total: 2000000,
    },
  },
  {
    amount: 20000000,
    installmentCount: 9,
    merchant_a: {
      percentage: 5000000,
      installmentAmount: 1111000,
      roundingDifference: 1000,
      total: 10000000,
    },
    merchant_b: {
      percentage: 5000000,
      installmentAmount: 1111000,
      roundingDifference: 1000,
      total: 10000000,
    },
  },
  {
    amount: 20000000,
    installmentCount: 21,
    merchant_a: {
      percentage: 6000000,
      installmentAmount: 571000,
      roundingDifference: 9000,
      total: 12000000,
    },
    merchant_b: {
      percentage: 4000000,
      installmentAmount: 380000,
      roundingDifference: 20000,
      total: 8000000,
    },
  },
])(
  'Testing base installment with each cases with two participants',
  (expectedCase: any) => {
    let pricing: Pricing

    const testingTransactionData = {
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
      amount: expectedCase.amount,
      currencyCode: '986',
      installmentTransactionData: {
        installmentCount: expectedCase.installmentCount,
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

    const testSplitRule = SplitRulesRepository.fromDB(
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
          percentage: expectedCase.merchant_a.percentage,
          created_at: new Date('2021-07-30T18:38:10.452Z'),
          deleted_at: null,
        },
        {
          id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
          split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
          merchant_id: 'merchant_b',
          percentage: expectedCase.merchant_b.percentage,
          created_at: new Date('2021-07-30T18:38:10.452Z'),
          deleted_at: null,
        },
      ]
    )

    const testIsoRevenueRule = IsoRevenueRulesRepository.fromDB({
      id: '4969b255-d742-4e57-9cfa-715466bcf816',
      iso_id: '5cf141b986642840656717f1',
      merchant_id: null,
      pricing_group_id: null,
      percentage: expectedCase.merchant_a.percentage,
      use_split_values: true,
      flat: null,
      matching_rule: { accountType: { $eq: 'credit' } },
      created_at: new Date('2021-07-14T22:25:31.512Z'),
      deleted_at: null,
    })

    const testHashRevenueRule = HashRevenueRulesRepository.fromDB({
      id: '4969b255-d742-4e57-9cfa-715466bcf816',
      iso_id: '5cf141b986642840656717f1',
      merchant_id: null,
      pricing_group_id: null,
      percentage: expectedCase.merchant_b.percentage,
      flat: null,
      matching_rule: { accountType: { $eq: 'credit' } },
      created_at: new Date('2021-05-04T19:56:04.322Z'),
      deleted_at: null,
    })

    const getInstallmentsMerchantA = (testPricing: Pricing) => {
      return testPricing.splitDetail.filter(
        (split) => split.merchantId === 'merchant_a'
      )
    }

    const getInstallmentsMerchantB = (testPricing: Pricing) => {
      return testPricing.splitDetail.filter(
        (split) => split.merchantId === 'merchant_b'
      )
    }

    beforeAll(async () => {
      testingTransactionData.amount = expectedCase.amount
      testingTransactionData.installmentTransactionData.installmentCount =
        expectedCase.installmentCount

      sinon
        .stub(SplitRulesRepository, 'findActiveRulesByTarget')
        .resolves([testSplitRule])
      sinon
        .stub(IsoRevenueRulesRepository, 'findActiveRulesByTarget')
        .resolves([testIsoRevenueRule])
      sinon
        .stub(HashRevenueRulesRepository, 'findActiveRulesByTarget')
        .resolves([testHashRevenueRule])

      pricing = await new CalculatePricingForTransaction().execute(
        testingTransactionData
      )
    })

    afterAll(() => {
      sinon.restore()
    })

    test('testing number of installments with two split participants', () => {
      expect(expectedCase.installmentCount * 2).toEqual(
        pricing.splitDetail.length
      )
    })

    test('testing base installment after split with rouding difference merchant_a', () => {
      const installmentsMerchantA = getInstallmentsMerchantA(pricing)
      expect(installmentsMerchantA[0].splitAmount).toEqual(
        expectedCase.merchant_a.installmentAmount
      )
    })

    test('testing base installment after split with rouding difference merchant_b', () => {
      const installmentsMerchantB = getInstallmentsMerchantB(pricing)
      expect(installmentsMerchantB[0].splitAmount).toEqual(
        expectedCase.merchant_b.installmentAmount
      )
    })

    test('testing last installment after split with rouding difference merchant_a', () => {
      const installmentsMerchantA = getInstallmentsMerchantA(pricing)
      const merchantAinstallment = expectedCase.merchant_a
        .installmentAmount as number
      const merchantARoudingDifference = expectedCase.merchant_a
        .roundingDifference as number

      expect(
        installmentsMerchantA[installmentsMerchantA.length - 1].splitAmount
      ).toEqual(merchantAinstallment + merchantARoudingDifference)
    })

    test('testing last installment after split with rouding difference merchant_b', () => {
      const installmentsMerchantB = getInstallmentsMerchantB(pricing)
      const merchantAinstallment = expectedCase.merchant_b
        .installmentAmount as number
      const merchantARoudingDifference = expectedCase.merchant_b
        .roundingDifference as number

      expect(
        installmentsMerchantB[installmentsMerchantB.length - 1].splitAmount
      ).toEqual(merchantAinstallment + merchantARoudingDifference)
    })

    test('testing total base installment after split with merchant_a', () => {
      const installmentsMerchantA = getInstallmentsMerchantA(pricing)

      const totalAmountMerchantA = installmentsMerchantA.reduce(
        (accumulated, object) => accumulated + object.splitAmount,
        0
      )
      expect(expectedCase.merchant_a.total).toEqual(totalAmountMerchantA)
    })

    test('testing total base installment after split with merchant_b', () => {
      const installmentsMerchantB = getInstallmentsMerchantB(pricing)

      const totalAmountMerchantB = installmentsMerchantB.reduce(
        (accumulated, object) => accumulated + object.splitAmount,
        0
      )
      expect(expectedCase.merchant_b.total).toEqual(totalAmountMerchantB)
    })
  }
)
