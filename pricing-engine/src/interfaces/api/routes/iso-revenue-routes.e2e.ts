import * as Hapi from '@hapi/hapi'
import { db } from 'infrastructure/db'
import { init } from 'interfaces/api'

describe('ISO Revenue API end-to-end tests', () => {
  let server: Hapi.Server

  const TABLE_NAME = 'iso_revenue_rules'

  const UUID_REGEX =
    /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/

  const ISO_DATE_REGEX =
    /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/

  beforeAll(async () => {
    server = await init()
  })

  afterAll(async () => {
    await db.destroy()
    await server.stop()
  })

  beforeEach(async () => {
    await db.migrate.latest({ directory: 'migrations' })
  })

  afterEach(async () => {
    await db.migrate.rollback({ directory: 'migrations' }, true)
  })

  test('insert two rules for an ISO', async () => {
    const payload = [
      {
        flat: 500,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
      {
        percentage: 3000,
        useSplitValues: false,
        matchingRule: { accountType: { $eq: 'debit' } },
      },
    ]

    const response = await server.inject({
      method: 'POST',
      url: '/iso/8/iso_revenue',
      payload,
    })

    expect(response.statusCode).toEqual(201)

    const responseBody = JSON.parse(response.payload)

    expect(responseBody).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        isoId: '8',
        useSplitValues: true,
        flat: 500,
        matchingRule: {
          accountType: { $eq: 'credit' },
        },
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        isoId: '8',
        percentage: 3000,
        useSplitValues: false,
        matchingRule: {
          accountType: { $eq: 'debit' },
        },
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
    ])

    const queryResult = await db.select().from(TABLE_NAME)

    expect(queryResult).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: '8',
        merchant_id: null,
        pricing_group_id: null,
        percentage: null,
        use_split_values: true,
        flat: 500,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: '8',
        merchant_id: null,
        pricing_group_id: null,
        percentage: 3000,
        use_split_values: false,
        flat: null,
        matching_rule: { accountType: { $eq: 'debit' } },
        created_at: expect.any(Date),
        deleted_at: null,
      },
    ])
  })

  test('insert two rules for a merchant', async () => {
    const payload = [
      {
        percentage: 72000,
        useSplitValues: true,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
      {
        flat: 6700,
        useSplitValues: false,
        matchingRule: { accountType: { $eq: 'debit' } },
      },
    ]

    const response = await server.inject({
      method: 'POST',
      url: '/merchant/merchant_a/iso_revenue',
      payload,
    })

    expect(response.statusCode).toEqual(201)

    const responseBody = JSON.parse(response.payload)

    expect(responseBody).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        merchantId: 'merchant_a',
        percentage: 72000,
        useSplitValues: true,
        matchingRule: {
          accountType: { $eq: 'credit' },
        },
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        merchantId: 'merchant_a',
        useSplitValues: false,
        flat: 6700,
        matchingRule: {
          accountType: { $eq: 'debit' },
        },
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
    ])

    const queryResult = await db.select().from(TABLE_NAME)

    expect(queryResult).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: null,
        merchant_id: 'merchant_a',
        pricing_group_id: null,
        percentage: 72000,
        use_split_values: true,
        flat: null,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: null,
        merchant_id: 'merchant_a',
        pricing_group_id: null,
        percentage: null,
        use_split_values: false,
        flat: 6700,
        matching_rule: { accountType: { $eq: 'debit' } },
        created_at: expect.any(Date),
        deleted_at: null,
      },
    ])
  })

  describe('database communication error', () => {
    beforeEach(async () => {
      await db.destroy()
    })

    afterEach(() => {
      db.initialize()
    })

    test('error when trying to insert data in iso_revenue_rules', async () => {
      const payload = [
        {
          percentage: 700000,
          matchingRule: { accountType: { $eq: 'credit' } },
        },
      ]

      const response = await server.inject({
        method: 'POST',
        url: '/iso/ISO1234/iso_revenue',
        payload,
      })

      expect(response.statusCode).toEqual(503)

      const responseBody = JSON.parse(response.payload)

      expect(responseBody).toEqual({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Error to insert data in iso_revenue_rules',
      })
    })
  })
})
