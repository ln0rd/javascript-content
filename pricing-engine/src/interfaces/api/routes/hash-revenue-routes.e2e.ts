import * as Hapi from '@hapi/hapi'
import { db } from 'infrastructure/db'
import { init } from 'interfaces/api'

describe('Hash Revenue API end-to-end tests', () => {
  let server: Hapi.Server

  const TABLE_NAME = 'hash_revenue_rules'

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

  test('Insert a new rule By Iso', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/iso/ISO123456/hash_revenue',
      payload: [
        {
          percentage: 1,
          matchingRule: { merchantId: { $eq: 'merchant1' } },
        },
      ],
    })

    expect(response.statusCode).toEqual(201)

    const responseBody = JSON.parse(response.payload)

    expect(responseBody).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        isoId: 'ISO123456',
        percentage: 1,
        matchingRule: {
          merchantId: { $eq: 'merchant1' },
        },
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
    ])

    const resultFromDatabase = await db(TABLE_NAME).select()

    expect(resultFromDatabase).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: 'ISO123456',
        merchant_id: null,
        pricing_group_id: null,
        percentage: 1,
        flat: null,
        matching_rule: {
          merchantId: { $eq: 'merchant1' },
        },
        created_at: expect.any(Date),
        deleted_at: null,
      },
    ])
  })

  test('Insert two rules and compare one of them from database', async () => {
    const responseApi = await server.inject({
      method: 'POST',
      url: '/iso/ISO123456/hash_revenue',
      payload: [
        {
          percentage: 1,
          matchingRule: { merchantId: { $eq: 'merchant1' } },
        },
        {
          percentage: 1,
          matchingRule: { merchantId: { $eq: 'merchant2' } },
        },
      ],
    })

    expect(responseApi.statusCode).toEqual(201)

    const responseBody = JSON.parse(responseApi.payload)

    expect(responseBody).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        isoId: 'ISO123456',
        percentage: 1,
        matchingRule: {
          merchantId: { $eq: 'merchant1' },
        },
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        isoId: 'ISO123456',
        percentage: 1,
        matchingRule: {
          merchantId: { $eq: 'merchant2' },
        },
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
    ])

    const resultFromDatabase = await db(TABLE_NAME).select()

    expect(resultFromDatabase).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: 'ISO123456',
        merchant_id: null,
        pricing_group_id: null,
        percentage: 1,
        flat: null,
        matching_rule: {
          merchantId: { $eq: 'merchant1' },
        },
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: 'ISO123456',
        merchant_id: null,
        pricing_group_id: null,
        percentage: 1,
        flat: null,
        matching_rule: {
          merchantId: { $eq: 'merchant2' },
        },
        created_at: expect.any(Date),
        deleted_at: null,
      },
    ])
  })

  test('Insert a new rule By Merchant', async () => {
    const responseApi = await server.inject({
      method: 'POST',
      url: '/merchant/MCT123456/hash_revenue',
      payload: [
        {
          percentage: 1,
          matchingRule: { merchantId: { $eq: 'merchant1' } },
        },
      ],
    })

    expect(responseApi.statusCode).toEqual(201)

    const responseBody = JSON.parse(responseApi.payload)

    expect(responseBody).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        merchantId: 'MCT123456',
        percentage: 1,
        matchingRule: {
          merchantId: { $eq: 'merchant1' },
        },
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
    ])

    const resultFromDatabase = await db(TABLE_NAME).select()

    expect(resultFromDatabase).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: null,
        merchant_id: 'MCT123456',
        pricing_group_id: null,
        percentage: 1,
        flat: null,
        matching_rule: {
          merchantId: { $eq: 'merchant1' },
        },
        created_at: expect.any(Date),
        deleted_at: null,
      },
    ])
  })

  test('test passing flat and percentage property to hash revenue routes', async () => {
    const payload = [
      {
        percentage: 2,
        flat: 2,
        matchingRule: { accountType: { $eq: 'debit' } },
      },
    ]

    const response = await server.inject({
      method: 'POST',
      url: '/iso/ISO1234/hash_revenue',
      payload,
    })

    expect(response.statusCode).toEqual(201)

    const responseBody = JSON.parse(response.payload)

    expect(responseBody).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        isoId: 'ISO1234',
        percentage: 2,
        flat: 2,
        matchingRule: { accountType: { $eq: 'debit' } },
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
    ])

    const resultFromDatabase = await db(TABLE_NAME).select()

    expect(resultFromDatabase).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: 'ISO1234',
        merchant_id: null,
        pricing_group_id: null,
        percentage: 2,
        flat: 2,
        matching_rule: { accountType: { $eq: 'debit' } },
        created_at: expect.any(Date),
        deleted_at: null,
      },
    ])
  })

  describe('error in communicate with database', () => {
    beforeEach(async () => {
      await db.destroy()
    })

    afterEach(() => {
      db.initialize()
    })

    test('problem to inserting data in hash_revenue_rules', async () => {
      const payload = [
        {
          percentage: 2,
          flat: undefined,
          matchingRule: { accountType: { $eq: 'credit' } },
        },
        {
          percentage: 2,
          flat: undefined,
          matchingRule: { accountType: { $eq: 'debit' } },
        },
      ]

      const response = await server.inject({
        method: 'POST',
        url: '/iso/ISO1234/hash_revenue',
        payload,
      })

      const responseBody = JSON.parse(response.payload)
      expect(response.statusCode).toEqual(503)
      expect(responseBody.statusCode).toEqual(503)
      expect(responseBody.message).toEqual(
        'Error to insert data in hash_revenue_rules'
      )
    })
  })

  describe('Testing fail action', () => {
    test('test failAction in percentage property to hash revenue routes', async () => {
      const payload = [
        {
          percentage: '2',
          matchingRule: { accountType: { $eq: 'credit' } },
        },
        {
          percentage: 2,
          matchingRule: { accountType: { $eq: 'debit' } },
        },
      ]

      const response = await server.inject({
        method: 'POST',
        url: '/iso/ISO1234/hash_revenue',
        payload,
      })

      const responseBody = JSON.parse(response.payload)
      expect(response.statusCode).toEqual(400)
      expect(responseBody.statusCode).toEqual(400)
      expect(responseBody.message).toEqual('"[0].percentage" must be a number')
    })

    test('test when percentage and flat are missing', async () => {
      const payload = [
        {
          matchingRule: { accountType: { $eq: 'debit' } },
        },
        {
          matchingRule: { accountType: { $eq: 'debit' } },
        },
      ]

      const response = await server.inject({
        method: 'POST',
        url: '/iso/ISO1234/hash_revenue',
        payload,
      })

      const responseBody = JSON.parse(response.payload)
      expect(response.statusCode).toEqual(400)
      expect(responseBody.statusCode).toEqual(400)
      expect(responseBody.message).toEqual(
        '"HashRevenueRule" must contain at least one of [percentage, flat]'
      )
    })

    test('test failAction in matchingRule property to hash revenue routes', async () => {
      const payload = [
        {
          percentage: 2,
          matchingRule: 'it is not an object ',
        },
        {
          percentage: 2,
          matchingRule: { accountType: { $eq: 'debit' } },
        },
      ]

      const response = await server.inject({
        method: 'POST',
        url: '/iso/ISO1234/hash_revenue',
        payload,
      })

      const responseBody = JSON.parse(response.payload)
      expect(response.statusCode).toEqual(400)
      expect(responseBody.statusCode).toEqual(400)
      expect(responseBody.message).toEqual(
        '"[0].matchingRule" must be of type object'
      )
    })

    test('test invalid matchingRule', async () => {
      const payload = [
        {
          percentage: 2,
          matchingRule: { accountType: 'debit' },
        },
      ]

      const response = await server.inject({
        method: 'POST',
        url: '/iso/ISO1234/hash_revenue',
        payload,
      })

      expect(response.statusCode).toEqual(400)

      const responseBody = JSON.parse(response.payload)
      expect(responseBody.message).toEqual('"debit" is not a valid query.')
    })
  })
})
