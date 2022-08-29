import * as Hapi from '@hapi/hapi'
import { SplitRule } from 'domain/model/split-rule'
import { DatabaseCommunicationError } from 'errors/database-communication-error'
import { SplitRulesRepository } from 'infrastructure/repository/split-rules-repository'
import { init } from 'interfaces/api'
import * as sinon from 'sinon'

describe('Split Rule routes', () => {
  let server: Hapi.Server

  beforeAll(async () => {
    server = await init()
  })

  afterAll(async () => {
    await server.stop()
  })

  afterEach(() => {
    sinon.restore()
  })

  test('POST /iso/{isoID}/split', async () => {
    const splitRuleRows: SplitRule[] = [
      SplitRulesRepository.fromDB(
        {
          id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
          iso_id: '42',
          merchant_id: null,
          pricing_group_id: null,
          matching_rule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
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
          iso_id: '42',
          merchant_id: null,
          pricing_group_id: null,
          matching_rule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
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

    sinon.stub(SplitRulesRepository, 'insertMany').resolves(splitRuleRows)

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
          { merchantId: 'THX11368', percentage: 6000000 },
        ],
      },
    ]

    const expectedResponse = [
      {
        id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
        isoId: '42',
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        instructions: [
          { merchantId: 'MER123123', percentage: 7000000 },
          { merchantId: 'MER999999', percentage: 3000000 },
        ],
        createdAt: '2021-07-30T18:38:10.452Z',
      },
      {
        id: '63013625-ea67-42bd-bc97-2a094daacdad',
        isoId: '42',
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
        instructions: [
          { merchantId: 'HAL9000', percentage: 4000000 },
          { merchantId: 'THX1138', percentage: 6000000 },
        ],
        createdAt: '2021-07-30T18:38:10.452Z',
      },
    ]

    const response = await server.inject({
      method: 'POST',
      url: '/iso/42/split',
      payload,
    })

    expect(response.statusCode).toEqual(201)

    const responsePayload = JSON.parse(response.payload)

    expect(responsePayload).toEqual(expectedResponse)
  })

  test('POST /merchant/{merchantId}/split', async () => {
    const splitRuleRows: SplitRule[] = [
      SplitRulesRepository.fromDB(
        {
          id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
          iso_id: null,
          merchant_id: 'MER8000',
          pricing_group_id: null,
          matching_rule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          created_at: new Date('2021-08-05T19:06:10.482Z'),
          deleted_at: null,
        },
        [
          {
            id: '2602b87f-74f9-453c-8f68-0ec3a91cc7af',
            split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
            merchant_id: 'MER123123',
            percentage: 7000000,
            created_at: new Date('2021-08-05T19:06:10.482Z'),
            deleted_at: null,
          },
          {
            id: 'bc7df662-0849-4031-b8fa-cd0f081885cc',
            split_rule_id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
            merchant_id: 'MER999999',
            percentage: 3000000,
            created_at: new Date('2021-08-05T19:06:10.482Z'),
            deleted_at: null,
          },
        ]
      ),
      SplitRulesRepository.fromDB(
        {
          id: '63013625-ea67-42bd-bc97-2a094daacdad',
          iso_id: null,
          merchant_id: 'MER8000',
          pricing_group_id: null,
          matching_rule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
          created_at: new Date('2021-08-05T19:06:10.482Z'),
          deleted_at: null,
        },
        [
          {
            id: '301366ca-8d3e-4412-8dd3-9481dc1e71b6',
            split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
            merchant_id: 'HAL9000',
            percentage: 9000000,
            created_at: new Date('2021-08-05T19:06:10.482Z'),
            deleted_at: null,
          },
          {
            id: 'cdc7dcf0-b762-45a5-bf42-384cecae4eeb',
            split_rule_id: '63013625-ea67-42bd-bc97-2a094daacdad',
            merchant_id: 'THX1138',
            percentage: 1000000,
            created_at: new Date('2021-08-05T19:06:10.482Z'),
            deleted_at: null,
          },
        ]
      ),
    ]

    sinon.stub(SplitRulesRepository, 'insertMany').resolves(splitRuleRows)

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
          { merchantId: 'HAL9000', percentage: 9000000 },
          { merchantId: 'THX11368', percentage: 1000000 },
        ],
      },
    ]

    const expectedResponse = [
      {
        id: 'cb8aa4fd-4d03-49e1-acf9-c7876dd06bce',
        merchantId: 'MER8000',
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        instructions: [
          { merchantId: 'MER123123', percentage: 7000000 },
          { merchantId: 'MER999999', percentage: 3000000 },
        ],
        createdAt: '2021-08-05T19:06:10.482Z',
      },
      {
        id: '63013625-ea67-42bd-bc97-2a094daacdad',
        merchantId: 'MER8000',
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
        instructions: [
          { merchantId: 'HAL9000', percentage: 9000000 },
          { merchantId: 'THX1138', percentage: 1000000 },
        ],
        createdAt: '2021-08-05T19:06:10.482Z',
      },
    ]

    const response = await server.inject({
      method: 'POST',
      url: '/merchant/MER8000/split',
      payload,
    })

    expect(response.statusCode).toEqual(201)

    const responsePayload = JSON.parse(response.payload)

    expect(responsePayload).toEqual(expectedResponse)
  })

  const invalidRequests = [
    [
      'payload is not array',
      {
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        instructions: [
          { merchantId: 'MER123123', percentage: 7000000 },
          { merchantId: 'MER999999', percentage: 3000000 },
        ],
      },
    ],
    [
      'isoId exists in payload',
      [
        {
          isoId: 'ISO123',
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 'MER123123', percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    ],
    [
      'merchantId exists in payload',
      [
        {
          merchantId: 'MER123',
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 'MER123123', percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    ],
    [
      'pricingGroupId exists in payload',
      [
        {
          pricingGroupId: 'PRC123',
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 'MER123123', percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    ],
    [
      'invalid percentage in instructions',
      [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 'MER123123', percentage: '7000000' },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    ],
    [
      'Percentage is negative',
      [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 'MER123123', percentage: -7000000 },
            { merchantId: 'MER999999', percentage: 17000000 },
          ],
        },
      ],
    ],
    [
      'Percentage is zero',
      [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 'MER123123', percentage: 0 },
            { merchantId: 'MER999999', percentage: 10000000 },
          ],
        },
      ],
    ],
    [
      'missing percentage in instructions',
      [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 'MER123123' },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    ],
    [
      'invalid merchantId in instructions',
      [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 123123, percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    ],
    [
      'missing merchantId in instructions',
      [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    ],
    [
      'missing instructions',
      [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        },
      ],
    ],
    [
      'percentages does not sum 100%',
      [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 'MER123123', percentage: 1000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    ],
    [
      'matchingRule is not an object',
      [
        {
          matchingRule: "{ 'paymentNetworkData.alphaCode': { $eq: 'MCC' } }",
          instructions: [
            { merchantId: 'MER123123', percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    ],
    [
      'unexpected property',
      [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          flat: 90000,
          instructions: [
            { merchantId: 'MER123123', percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    ],
  ]

  const assertBadRequestResponse = (response: Hapi.ServerInjectResponse) => {
    expect(response.statusCode).toEqual(400)

    const responseBody = JSON.parse(response.payload)
    expect(responseBody).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: expect.any(String),
      validation: {
        source: expect.any(String),
        keys: expect.any(Array),
      },
    })
  }

  test.each(invalidRequests)(
    'BAD_REQUEST /iso/{isoId}/split when %p',
    async (reason: string, invalidPayload: any) => {
      sinon.stub(SplitRulesRepository, 'insertMany').resolves([])

      const response = await server.inject({
        method: 'POST',
        url: '/iso/803/split',
        payload: invalidPayload,
      })

      assertBadRequestResponse(response)
    }
  )

  test.each(invalidRequests)(
    'BAD_REQUEST /merchant/{merchantId}/split when %p',
    async (reason: string, invalidPayload: any) => {
      sinon.stub(SplitRulesRepository, 'insertMany').resolves([])

      const response = await server.inject({
        method: 'POST',
        url: '/merchant/MER8000/split',
        payload: invalidPayload,
      })

      assertBadRequestResponse(response)
    }
  )

  test('BAD_REQUEST /iso/{isoId}/split should send the validation message', async () => {
    sinon.stub(SplitRulesRepository, 'insertMany').resolves([])

    const response = await server.inject({
      method: 'POST',
      url: '/iso/ISO123/split',
      payload: [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': 'MCC' },
          instructions: [
            { merchantId: 'MER123123', percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    })

    expect(response.statusCode).toEqual(400)

    const responseBody = JSON.parse(response.payload)
    expect(responseBody.message).toEqual('"MCC" is not a valid query.')
  })

  test('BAD_REQUEST /merchant/{merchantId}/split should send the validation message', async () => {
    sinon.stub(SplitRulesRepository, 'insertMany').resolves([])

    const response = await server.inject({
      method: 'POST',
      url: '/merchant/MER8000/split',
      payload: [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': 'MCC' },
          instructions: [
            { merchantId: 'MER123123', percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ],
    })

    expect(response.statusCode).toEqual(400)

    const responseBody = JSON.parse(response.payload)
    expect(responseBody.message).toEqual('"MCC" is not a valid query.')
  })

  test('SERVICE UNAVAILABLE /merchant/{merchantId}/split', async () => {
    const databaseError = new DatabaseCommunicationError(
      'Error to insert data in split rule tables'
    )
    sinon.stub(SplitRulesRepository, 'insertMany').throws(databaseError)

    const payload = [
      {
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
        instructions: [
          { merchantId: 'HAL9000', percentage: 9000000 },
          { merchantId: 'THX11368', percentage: 1000000 },
        ],
      },
    ]
    const response = await server.inject({
      method: 'POST',
      url: '/merchant/merchant_b/split',
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

  test('INTERNAL SERVER ERROR /merchant/{merchantId}/split', async () => {
    const databaseError = new Error()
    sinon.stub(SplitRulesRepository, 'insertMany').throws(databaseError)

    const payload = [
      {
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'SCI' } },
        instructions: [
          { merchantId: 'HAL9000', percentage: 9000000 },
          { merchantId: 'THX11368', percentage: 1000000 },
        ],
      },
    ]
    const response = await server.inject({
      method: 'POST',
      url: '/merchant/merchant_b/split',
      payload,
    })

    expect(response.statusCode).toEqual(500)

    const responseBody = JSON.parse(response.payload)
    expect(responseBody).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An internal server error occurred',
    })
  })
})
