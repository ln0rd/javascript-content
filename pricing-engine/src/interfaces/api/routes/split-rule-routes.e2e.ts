import * as Hapi from '@hapi/hapi'
import { db } from 'infrastructure/db'
import { init } from 'interfaces/api'

describe('Split Rule API end-to-end tests', () => {
  let server: Hapi.Server

  const SPLIT_RULES_TABLE_NAME = 'split_rules'
  const SPLIT_INSTRUCTIONS_TABLE_NAME = 'split_instructions'

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

  test('Insert two rules for an ISO', async () => {
    const payload = [
      {
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        instructions: [
          { merchantId: 'MER123123', percentage: 7000000 },
          { merchantId: 'MER999999', percentage: 3000000 },
        ],
      },
      {
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
        instructions: [
          { merchantId: 'HAL9000', percentage: 4000000 },
          { merchantId: 'THX1138', percentage: 6000000 },
        ],
      },
    ]

    const response = await server.inject({
      method: 'POST',
      url: '/iso/42/split',
      payload,
    })

    const splitRulesRows = await db.select().from(SPLIT_RULES_TABLE_NAME)
    const splitInstructionsRows = await db
      .select()
      .from(SPLIT_INSTRUCTIONS_TABLE_NAME)

    expect(response.statusCode).toEqual(201)

    const responseBody = JSON.parse(response.payload)

    expect(responseBody.length).toEqual(2)

    expect(responseBody).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        isoId: '42',
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        instructions: [
          { merchantId: 'MER123123', percentage: 7000000 },
          { merchantId: 'MER999999', percentage: 3000000 },
        ],
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        isoId: '42',
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
        instructions: [
          { merchantId: 'HAL9000', percentage: 4000000 },
          { merchantId: 'THX1138', percentage: 6000000 },
        ],
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
    ])

    expect(splitRulesRows.length).toEqual(2)

    expect(splitRulesRows).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: '42',
        merchant_id: null,
        pricing_group_id: null,
        matching_rule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: '42',
        merchant_id: null,
        pricing_group_id: null,
        matching_rule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
        created_at: expect.any(Date),
        deleted_at: null,
      },
    ])

    expect(splitInstructionsRows).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        split_rule_id: splitRulesRows[0].id,
        merchant_id: 'MER123123',
        percentage: 7000000,
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        split_rule_id: splitRulesRows[0].id,
        merchant_id: 'MER999999',
        percentage: 3000000,
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        split_rule_id: splitRulesRows[1].id,
        merchant_id: 'HAL9000',
        percentage: 4000000,
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        split_rule_id: splitRulesRows[1].id,
        merchant_id: 'THX1138',
        percentage: 6000000,
        created_at: expect.any(Date),
        deleted_at: null,
      },
    ])
  })

  test('Insert two rules for a merchant', async () => {
    const payload = [
      {
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        instructions: [
          { merchantId: 'MER123123', percentage: 6000000 },
          { merchantId: 'MER999999', percentage: 4000000 },
        ],
      },
      {
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
        instructions: [
          { merchantId: 'HAL9000', percentage: 9000000 },
          { merchantId: 'THX1138', percentage: 1000000 },
        ],
      },
    ]

    const response = await server.inject({
      method: 'POST',
      url: '/merchant/MER8000/split',
      payload,
    })

    const splitRulesRows = await db.select().from(SPLIT_RULES_TABLE_NAME)
    const splitInstructionsRows = await db
      .select()
      .from(SPLIT_INSTRUCTIONS_TABLE_NAME)

    expect(response.statusCode).toEqual(201)

    const responseBody = JSON.parse(response.payload)

    expect(responseBody.length).toEqual(2)

    expect(responseBody).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        merchantId: 'MER8000',
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        instructions: [
          { merchantId: 'MER123123', percentage: 6000000 },
          { merchantId: 'MER999999', percentage: 4000000 },
        ],
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        merchantId: 'MER8000',
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
        instructions: [
          { merchantId: 'HAL9000', percentage: 9000000 },
          { merchantId: 'THX1138', percentage: 1000000 },
        ],
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
      },
    ])

    expect(splitRulesRows.length).toEqual(2)

    expect(splitRulesRows).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: null,
        merchant_id: 'MER8000',
        pricing_group_id: null,
        matching_rule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        iso_id: null,
        merchant_id: 'MER8000',
        pricing_group_id: null,
        matching_rule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
        created_at: expect.any(Date),
        deleted_at: null,
      },
    ])

    expect(splitInstructionsRows).toEqual([
      {
        id: expect.stringMatching(UUID_REGEX),
        split_rule_id: splitRulesRows[0].id,
        merchant_id: 'MER123123',
        percentage: 6000000,
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        split_rule_id: splitRulesRows[0].id,
        merchant_id: 'MER999999',
        percentage: 4000000,
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        split_rule_id: splitRulesRows[1].id,
        merchant_id: 'HAL9000',
        percentage: 9000000,
        created_at: expect.any(Date),
        deleted_at: null,
      },
      {
        id: expect.stringMatching(UUID_REGEX),
        split_rule_id: splitRulesRows[1].id,
        merchant_id: 'THX1138',
        percentage: 1000000,
        created_at: expect.any(Date),
        deleted_at: null,
      },
    ])
  })

  describe('database errors', () => {
    const payload = [
      {
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        instructions: [
          { merchantId: 'MER123123', percentage: 7000000 },
          { merchantId: 'MER999999', percentage: 3000000 },
        ],
      },
    ]

    afterEach(() => {
      db.initialize()
    })

    test('communication error', async () => {
      await db.destroy()

      const response = await server.inject({
        method: 'POST',
        url: '/iso/ISO123/split',
        payload,
      })

      expect(response.statusCode).toEqual(503)

      const responseBody = JSON.parse(response.payload)

      expect(responseBody).toEqual({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Error to insert data in split rule tables',
      })
    })

    test('should rollback transactions', async () => {
      await db.schema.table(SPLIT_INSTRUCTIONS_TABLE_NAME, (t) =>
        t.dropColumn('id')
      )

      const response = await server.inject({
        method: 'POST',
        url: '/iso/ISO123/split',
        payload,
      })

      expect(response.statusCode).toEqual(500)

      const responseBody = JSON.parse(response.payload)

      expect(responseBody).toEqual({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An internal server error occurred',
      })

      const splitRulesRows = await db(SPLIT_RULES_TABLE_NAME).select()

      expect(splitRulesRows.length).toEqual(0)

      const splitInstructionsRows = await db(
        SPLIT_INSTRUCTIONS_TABLE_NAME
      ).select()

      expect(splitInstructionsRows.length).toEqual(0)
    })
  })
})
