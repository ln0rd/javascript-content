import * as Hapi from '@hapi/hapi'
import { RegisterIsoRevenueRule } from 'application/use-cases/register-iso-revenue-rule'
import { IsoRevenueRule } from 'domain/model/iso-revenue-rule'
import { DatabaseCommunicationError } from 'errors/database-communication-error'
import { IsoRevenueRulesRepository } from 'infrastructure/repository/iso-revenue-rules-repository'
import { init } from 'interfaces/api'
import * as sinon from 'sinon'

describe('ISO Revenue routes', () => {
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

  const validPayloads = [
    [
      'with percentage',
      [
        {
          percentage: 1300,
          useSplitValues: false,
          matchingRule: { isoId: { $eq: 'iso1' } },
        },
      ],
      1300,
      undefined,
    ],
    [
      'with flat',
      [
        {
          useSplitValues: false,
          flat: 200,
          matchingRule: { isoId: { $eq: 'iso1' } },
        },
      ],
      undefined,
      200,
    ],
    [
      'with both flat and percentage',
      [
        {
          percentage: 1300,
          useSplitValues: true,
          flat: 200,
          matchingRule: { isoId: { $eq: 'iso1' } },
        },
      ],
      undefined,
      200,
    ],
  ]

  test.each(validPayloads)(
    'POST /iso/{isoId}/iso_revenue %p',
    async (
      reason: string,
      payload: any,
      expectedPercentage: number,
      expectedFlat: number
    ) => {
      const dbResult: IsoRevenueRule[] = [
        {
          id: '28c25e65-d0b2-41e3-a4c6-09c262b9dfeb',
          iso_id: '42',
          merchant_id: null,
          pricing_group_id: null,
          percentage: expectedPercentage ?? null,
          use_split_values: false,
          flat: expectedFlat ?? null,
          matching_rule: { isoId: { $eq: 'iso1' } },
          created_at: new Date('2021-07-13T14:12:10.322Z'),
          deleted_at: null,
        },
      ].map((rule) => IsoRevenueRulesRepository.fromDB(rule))

      sinon.stub(IsoRevenueRulesRepository, 'insertMany').resolves(dbResult)

      const response = await server.inject({
        method: 'POST',
        url: '/iso/42/iso_revenue',
        payload,
      })

      expect(response.statusCode).toEqual(201)

      const responsePayload = JSON.parse(response.payload)

      expect(responsePayload).toEqual([
        {
          id: '28c25e65-d0b2-41e3-a4c6-09c262b9dfeb',
          isoId: '42',
          percentage: expectedPercentage,
          useSplitValues: false,
          flat: expectedFlat,
          matchingRule: { isoId: { $eq: 'iso1' } },
          createdAt: '2021-07-13T14:12:10.322Z',
        },
      ])
    }
  )

  test.each(validPayloads)(
    'POST /merchant/{merchantId}/iso_revenue %p',
    async (
      reason: string,
      payload: any,
      expectedPercentage: number,
      expectedFlat: number
    ) => {
      const dbResult: IsoRevenueRule[] = [
        {
          id: '28c25e65-d0b2-41e3-a4c6-09c262b9dfeb',
          iso_id: null,
          merchant_id: '42',
          pricing_group_id: null,
          percentage: expectedPercentage ?? null,
          use_split_values: false,
          flat: expectedFlat ?? null,
          matching_rule: { isoId: { $eq: 'iso1' } },
          created_at: new Date('2021-07-13T14:12:10.322Z'),
          deleted_at: null,
        },
      ].map((rule) => IsoRevenueRulesRepository.fromDB(rule))

      sinon.stub(IsoRevenueRulesRepository, 'insertMany').resolves(dbResult)

      const response = await server.inject({
        method: 'POST',
        url: '/merchant/42/iso_revenue',
        payload,
      })

      expect(response.statusCode).toEqual(201)

      const responsePayload = JSON.parse(response.payload)

      expect(responsePayload).toEqual([
        {
          id: '28c25e65-d0b2-41e3-a4c6-09c262b9dfeb',
          merchantId: '42',
          percentage: expectedPercentage,
          useSplitValues: false,
          flat: expectedFlat,
          matchingRule: { isoId: { $eq: 'iso1' } },
          createdAt: '2021-07-13T14:12:10.322Z',
        },
      ])
    }
  )

  const invalidRequests = [
    [
      'payload is not array',
      {
        percentage: 1300,
        matchingRule: { isoId: { $eq: 'iso1' } },
      },
    ],
    [
      'isoId exists in payload',
      [
        {
          isoId: '1',
          flat: 200,
          matchingRule: { isoId: { $eq: 'iso1' } },
        },
      ],
    ],
    [
      'merchantId exists in payload',
      [
        {
          merchantId: '007',
          percentage: 1300,
          matchingRule: { isoId: { $eq: 'iso1' } },
        },
      ],
    ],
    [
      'pricingGroupId exists in payload',
      [
        {
          pricingGroupId: '2314',
          flat: 200,
          matchingRule: { isoId: { $eq: 'iso1' } },
        },
      ],
    ],
    [
      'invalid percentage',
      [
        {
          percentage: '1300',
          matchingRule: { isoId: { $eq: 'iso1' } },
        },
      ],
    ],
    [
      'invalid useSplitValues',
      [
        {
          useSplitValues: 'false',
          flat: 200,
          matchingRule: { isoId: { $eq: 'iso1' } },
        },
      ],
    ],
    [
      'invalid flat',
      [
        {
          flat: '200',
          matchingRule: { isoId: { $eq: 'iso1' } },
        },
      ],
    ],
    [
      'matchingRule is not an object',
      [
        {
          percentage: 1300,
          matchingRule: "{ 'isoId': { '$eq': 'iso1' } }",
        },
      ],
    ],
    [
      'unexpected property',
      [
        {
          unexpectedProperty: 'value',
          flat: 200,
          matchingRule: { isoId: { $eq: 'iso1' } },
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
    'BAD_REQUEST /iso/{isoId}/iso_revenue when %p',
    async (reason: string, invalidPayload: any) => {
      sinon.stub(RegisterIsoRevenueRule.prototype, 'execute').resolves([])

      const response = await server.inject({
        method: 'POST',
        url: '/iso/412/iso_revenue',
        payload: invalidPayload,
      })

      assertBadRequestResponse(response)
    }
  )

  test.each(invalidRequests)(
    'BAD REQUEST /merchant/{merchantId}/iso_revenue when %p',
    async (reason: string, invalidPayload: any) => {
      sinon.stub(RegisterIsoRevenueRule.prototype, 'execute').resolves([])

      const response = await server.inject({
        method: 'POST',
        url: '/merchant/merchant_b/iso_revenue',
        payload: invalidPayload,
      })

      assertBadRequestResponse(response)
    }
  )

  test('BAD_REQUEST /iso/{isoId}/iso_revenue should send the validation message', async () => {
    sinon.stub(IsoRevenueRulesRepository, 'insertMany').resolves([])

    const response = await server.inject({
      method: 'POST',
      url: '/iso/412/iso_revenue',
      payload: [
        {
          percentage: 1300,
          matchingRule: { isoId: 'iso1' },
        },
      ],
    })

    expect(response.statusCode).toEqual(400)

    const responseBody = JSON.parse(response.payload)
    expect(responseBody.message).toEqual('"iso1" is not a valid query.')
  })

  test('BAD_REQUEST /merchant/{isoId}/iso_revenue should send the validation message', async () => {
    sinon.stub(IsoRevenueRulesRepository, 'insertMany').resolves([])

    const response = await server.inject({
      method: 'POST',
      url: '/merchant/merchant_b/iso_revenue',
      payload: [
        {
          percentage: 1300,
          matchingRule: { isoId: 'iso1' },
        },
      ],
    })

    expect(response.statusCode).toEqual(400)

    const responseBody = JSON.parse(response.payload)
    expect(responseBody.message).toEqual('"iso1" is not a valid query.')
  })

  test('SERVICE UNAVAILABLE /iso/{isoId}/iso_revenue', async () => {
    const databaseError = new DatabaseCommunicationError(
      'Error to insert data in iso_revenue_rules'
    )
    sinon.stub(IsoRevenueRulesRepository, 'insertMany').throws(databaseError)

    const payload = [
      {
        percentage: 1300000,
        matchingRule: { isoId: { $eq: 'iso1' } },
      },
    ]
    const response = await server.inject({
      method: 'POST',
      url: '/merchant/merchant_b/iso_revenue',
      payload,
    })

    expect(response.statusCode).toEqual(503)

    const responseBody = JSON.parse(response.payload)
    expect(responseBody.statusCode).toEqual(503)
    expect(responseBody.message).toEqual(
      'Error to insert data in iso_revenue_rules'
    )
  })
})
