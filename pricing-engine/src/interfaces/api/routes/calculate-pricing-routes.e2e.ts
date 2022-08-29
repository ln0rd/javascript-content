import * as Hapi from '@hapi/hapi'
import { db } from 'infrastructure/db'
import { init } from 'interfaces/api'

describe('Calculate Pricing API end-to-end tests', () => {
  let server: Hapi.Server

  beforeAll(async () => {
    server = await init()
  })

  afterAll(async () => {
    await db.destroy()
    await server.stop()
  })

  describe('for a given transaction data list', () => {
    const transactionDataList = [
      {
        id: '1539985',
        hashCorrelationKey: '2501ed2d-c41a-427a-b7f3-40c97d69c7e2',
        isoID: '5cf141b986642840656717f1',
        merchantID: 'merchanta',
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
        isoID: '606382a65b80110006d7f709',
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

    let response: Hapi.ServerInjectResponse

    describe('and with rules configured for "merchanta" and "merchantb"', () => {
      beforeAll(async () => {
        await db.migrate.latest({ directory: 'migrations' })

        const insertedRows = await db('split_rules')
          .insert([
            {
              merchant_id: 'merchanta',
              matching_rule: { accountType: { $eq: 'credit' } },
              created_at: new Date('2021-09-01T15:04:58Z'),
            },
          ])
          .returning(['id'])

        await db('split_instructions').insert([
          {
            split_rule_id: insertedRows[0].id,
            merchant_id: 'merchanta',
            percentage: 7000000,
            created_at: new Date('2021-09-01T15:04:58Z'),
          },
          {
            split_rule_id: insertedRows[0].id,
            merchant_id: 'merchantb',
            percentage: 3000000,
            created_at: new Date('2021-09-01T15:04:58Z'),
          },
        ])

        await db('iso_revenue_rules').insert([
          {
            merchant_id: 'merchanta',
            percentage: 100000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-30T18:41:23Z'),
          },
          {
            merchant_id: 'merchantb',
            percentage: 50000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-07-17T22:11:28Z'),
          },
        ])

        await db('hash_revenue_rules').insert([
          {
            merchant_id: 'merchanta',
            percentage: 3000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-30T18:41:23Z'),
          },
          {
            merchant_id: 'merchantb',
            percentage: 1000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-07-17T22:11:28Z'),
          },
        ])

        response = await server.inject({
          method: 'POST',
          url: '/calculate_pricing',
          payload: transactionDataList,
        })
      })

      afterAll(async () => {
        await db.migrate.rollback({ directory: 'migrations' }, true)
      })

      test('should return with HTTP Status 200', () => {
        expect(response.statusCode).toEqual(200)
      })

      test('should return a JSON object with the pricing calculation', () => {
        const responseBody = JSON.parse(response.payload)

        expect(responseBody).toEqual([
          {
            transactionId: '1539985',
            splitDetail: [
              {
                merchantId: 'merchanta',
                installmentNumber: 1,
                splitAmount: 3500000,
                isoRevenueAmount: 35000,
              },
              {
                merchantId: 'merchanta',
                installmentNumber: 2,
                splitAmount: 3500000,
                isoRevenueAmount: 35000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 1,
                splitAmount: 1500000,
                isoRevenueAmount: 8000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 2,
                splitAmount: 1500000,
                isoRevenueAmount: 8000,
              },
            ],
            isoRevenueDetail: [
              {
                merchantId: 'merchanta',
                installmentNumber: 1,
                amount: 35000,
              },
              {
                merchantId: 'merchanta',
                installmentNumber: 2,
                amount: 35000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 1,
                amount: 8000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 2,
                amount: 8000,
              },
            ],
            hashRevenueDetail: [
              {
                merchantId: 'merchanta',
                installmentNumber: 1,
                amount: 1000,
              },
              {
                merchantId: 'merchanta',
                installmentNumber: 2,
                amount: 1000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 1,
                amount: 0,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 2,
                amount: 0,
              },
            ],
          },
          {
            transactionId: '01FMN657XCPBN601ZRXT8XYT57',
            splitDetail: [
              {
                merchantId: '6176e2174ad7d40007d09048',
                installmentNumber: 1,
                splitAmount: 3000000,
                isoRevenueAmount: 0,
              },
            ],
            isoRevenueDetail: [
              {
                merchantId: '6176e2174ad7d40007d09048',
                installmentNumber: 1,
                amount: 0,
              },
            ],
            hashRevenueDetail: [
              {
                merchantId: '6176e2174ad7d40007d09048',
                installmentNumber: 1,
                amount: 0,
              },
            ],
          },
        ])
      })
    })

    describe('and with generic rules configured for different isos and rules', () => {
      beforeAll(async () => {
        await db.migrate.latest({ directory: 'migrations' })

        const insertedRows = await db('split_rules')
          .insert([
            {
              iso_id: 'f6b6691e1c817f454a65408c',
              matching_rule: { accountType: { $eq: 'credit' } },
              created_at: new Date('2021-09-01T15:04:58Z'),
            },
          ])
          .returning(['id'])

        await db('split_instructions').insert([
          {
            split_rule_id: insertedRows[0].id,
            merchant_id: 'merchanta',
            percentage: 7000000,
            created_at: new Date('2021-09-01T15:04:58Z'),
          },
          {
            split_rule_id: insertedRows[0].id,
            merchant_id: 'merchantb',
            percentage: 3000000,
            created_at: new Date('2021-09-01T15:04:58Z'),
          },
        ])

        await db('iso_revenue_rules').insert([
          {
            iso_id: '5cf141b986642840656717f1',
            percentage: 117300,
            flat: 5000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-30T18:41:23Z'),
          },
          {
            iso_id: 'b9f61486671281457fc16540',
            percentage: 238000,
            flat: 5000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-30T18:41:23Z'),
          },
        ])

        await db('hash_revenue_rules').insert([
          {
            iso_id: '5cf141b986642840656717f1',
            percentage: 13000,
            flat: 1000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-30T18:41:23Z'),
          },
          {
            iso_id: '9cf1e1b98f641d406b17a7e5',
            percentage: 17000,
            flat: 2000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-08-30T18:41:23Z'),
          },
        ])

        response = await server.inject({
          method: 'POST',
          url: '/calculate_pricing',
          payload: transactionDataList,
        })
      })

      afterAll(async () => {
        await db.migrate.rollback({ directory: 'migrations' }, true)
      })

      test('should return with HTTP Status 200', () => {
        expect(response.statusCode).toEqual(200)
      })

      test('should return a JSON object with the pricing calculation for the right iso', () => {
        const responseBody = JSON.parse(response.payload)

        expect(responseBody).toEqual([
          {
            transactionId: '1539985',
            splitDetail: [
              {
                merchantId: 'merchanta',
                installmentNumber: 1,
                splitAmount: 5000000,
                isoRevenueAmount: 64000,
              },
              {
                merchantId: 'merchanta',
                installmentNumber: 2,
                splitAmount: 5000000,
                isoRevenueAmount: 64000,
              },
            ],
            isoRevenueDetail: [
              {
                merchantId: 'merchanta',
                installmentNumber: 1,
                amount: 64000,
              },
              {
                merchantId: 'merchanta',
                installmentNumber: 2,
                amount: 64000,
              },
            ],
            hashRevenueDetail: [
              {
                merchantId: 'merchanta',
                installmentNumber: 1,
                amount: 7000,
              },
              {
                merchantId: 'merchanta',
                installmentNumber: 2,
                amount: 7000,
              },
            ],
          },
          {
            transactionId: '01FMN657XCPBN601ZRXT8XYT57',
            splitDetail: [
              {
                merchantId: '6176e2174ad7d40007d09048',
                installmentNumber: 1,
                splitAmount: 3000000,
                isoRevenueAmount: 0,
              },
            ],
            isoRevenueDetail: [
              {
                merchantId: '6176e2174ad7d40007d09048',
                installmentNumber: 1,
                amount: 0,
              },
            ],
            hashRevenueDetail: [
              {
                merchantId: '6176e2174ad7d40007d09048',
                installmentNumber: 1,
                amount: 0,
              },
            ],
          },
        ])
      })
    })

    describe('and when the active rules for the transaction are old', () => {
      beforeAll(async () => {
        await db.migrate.latest({ directory: 'migrations' })

        let insertedRows = await db('split_rules')
          .insert([
            {
              iso_id: '5cf141b986642840656717f1',
              matching_rule: { accountType: { $eq: 'credit' } },
              created_at: new Date('2021-09-06T10:04:58Z'),
            },
          ])
          .returning(['id'])

        await db('split_instructions').insert([
          {
            split_rule_id: insertedRows[0].id,
            merchant_id: 'merchanta',
            percentage: 6000000,
            created_at: new Date('2021-09-06T10:04:58Z'),
          },
          {
            split_rule_id: insertedRows[0].id,
            merchant_id: 'merchantb',
            percentage: 4000000,
            created_at: new Date('2021-09-06T10:04:58Z'),
          },
        ])

        insertedRows = await db('split_rules')
          .insert([
            {
              iso_id: '5cf141b986642840656717f1',
              matching_rule: { accountType: { $eq: 'credit' } },
              created_at: new Date('2020-12-25T20:43:51Z'),
              deleted_at: new Date('2021-09-06T10:04:58Z'),
            },
          ])
          .returning(['id'])

        await db('split_instructions').insert([
          {
            split_rule_id: insertedRows[0].id,
            merchant_id: 'merchanta',
            percentage: 7000000,
            created_at: new Date('2020-12-25T20:43:51Z'),
            deleted_at: new Date('2021-09-06T10:04:58Z'),
          },
          {
            split_rule_id: insertedRows[0].id,
            merchant_id: 'merchantb',
            percentage: 3000000,
            created_at: new Date('2020-12-25T20:43:51Z'),
            deleted_at: new Date('2021-09-06T10:04:58Z'),
          },
        ])

        await db('iso_revenue_rules').insert([
          {
            iso_id: '5cf141b986642840656717f1',
            percentage: 237000,
            flat: 9000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2021-09-06T10:04:58Z'),
          },
          {
            iso_id: '5cf141b986642840656717f1',
            percentage: 117300,
            flat: 5000,
            matching_rule: { accountType: { $eq: 'credit' } },
            created_at: new Date('2020-12-25T20:43:51Z'),
            deleted_at: new Date('2021-09-06T10:04:58Z'),
          },
        ])

        await db('hash_revenue_rules').insert([
          {
            iso_id: '5cf141b986642840656717f1',
            percentage: 29000,
            flat: 7000,
            matching_rule: {
              accountType: { $eq: 'credit' },
              'installmentTransactionData.installmentCount': { $gt: 3 },
            },
            created_at: new Date('2021-09-06T10:04:58Z'),
          },
          {
            iso_id: '5cf141b986642840656717f1',
            percentage: 13000,
            flat: 1000,
            matching_rule: {
              accountType: { $eq: 'credit' },
              'installmentTransactionData.installmentCount': { $lte: 2 },
            },
            created_at: new Date('2020-12-25T20:43:51Z'),
            deleted_at: new Date('2021-09-06T10:04:58Z'),
          },
        ])

        response = await server.inject({
          method: 'POST',
          url: '/calculate_pricing',
          payload: transactionDataList,
        })
      })

      afterAll(async () => {
        await db.migrate.rollback({ directory: 'migrations' }, true)
      })

      test('should return with HTTP Status 200', () => {
        expect(response.statusCode).toEqual(200)
      })

      test('should return a JSON object with the pricing calculation using the rules active on the transaction date', () => {
        const responseBody = JSON.parse(response.payload)

        expect(responseBody).toEqual([
          {
            transactionId: '1539985',
            splitDetail: [
              {
                merchantId: 'merchanta',
                installmentNumber: 1,
                splitAmount: 3500000,
                isoRevenueAmount: 47000,
              },
              {
                merchantId: 'merchanta',
                installmentNumber: 2,
                splitAmount: 3500000,
                isoRevenueAmount: 47000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 1,
                splitAmount: 1500000,
                isoRevenueAmount: 23000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 2,
                splitAmount: 1500000,
                isoRevenueAmount: 23000,
              },
            ],
            isoRevenueDetail: [
              {
                merchantId: 'merchanta',
                installmentNumber: 1,
                amount: 47000,
              },
              {
                merchantId: 'merchanta',
                installmentNumber: 2,
                amount: 47000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 1,
                amount: 23000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 2,
                amount: 23000,
              },
            ],
            hashRevenueDetail: [
              {
                merchantId: 'merchanta',
                installmentNumber: 1,
                amount: 5000,
              },
              {
                merchantId: 'merchanta',
                installmentNumber: 2,
                amount: 5000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 1,
                amount: 2000,
              },
              {
                merchantId: 'merchantb',
                installmentNumber: 2,
                amount: 2000,
              },
            ],
          },
          {
            transactionId: '01FMN657XCPBN601ZRXT8XYT57',
            splitDetail: [
              {
                merchantId: '6176e2174ad7d40007d09048',
                installmentNumber: 1,
                splitAmount: 3000000,
                isoRevenueAmount: 0,
              },
            ],
            isoRevenueDetail: [
              {
                merchantId: '6176e2174ad7d40007d09048',
                installmentNumber: 1,
                amount: 0,
              },
            ],
            hashRevenueDetail: [
              {
                merchantId: '6176e2174ad7d40007d09048',
                installmentNumber: 1,
                amount: 0,
              },
            ],
          },
        ])
      })
    })
  })
})
