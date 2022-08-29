import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
import { RegisterRevenueRule } from 'application/use-cases/register-revenue-rule'
import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { RevenueRuleParams } from 'domain/model/revenue-rule'
import errorApiResponse from 'errors/error-api-response'
import logger from 'infrastructure/logger'
import { failAction } from 'interfaces/api/validations/fail-action'
import {
  isoParams,
  merchantParams,
} from 'interfaces/api/validations/param-options'
import { payloadOptions } from 'interfaces/api/validations/revenue-payload-options'
import { responseArray } from '../validations/response-validation'

interface HashRevenueRulePayloadItem {
  percentage?: number
  flat?: number
  matchingRule: { [key in string] }
}

const unwrap = (payload: HashRevenueRulePayloadItem[]): RevenueRuleParams[] => {
  return payload.map<RevenueRuleParams>((item) => ({
    percentage: item.percentage,
    flat: item.flat,
    matchingRule: item.matchingRule,
  }))
}

const wrap = (rules: HashRevenueRule[]): HashRevenueRulePayloadItem[] => {
  return rules.map<HashRevenueRulePayloadItem>((rule) => ({
    id: rule.id ?? undefined,
    isoId: rule.isoId ?? undefined,
    merchantId: rule.merchantId ?? undefined,
    pricingGroupId: rule.pricingGroupId ?? undefined,
    percentage: rule.percentage ?? undefined,
    flat: rule.flat ?? undefined,
    matchingRule: rule.matchingRule,
    createdAt: rule.createdAt?.toISOString(),
  }))
}

const handler = async (request: Request, res: ResponseToolkit) => {
  const { isoId, merchantId } = request.params
  const payloadItems = request.payload as HashRevenueRulePayloadItem[]

  const rules: RevenueRuleParams[] = unwrap(payloadItems)

  try {
    const registerRevenueRule = new RegisterRevenueRule()
    const result = await registerRevenueRule.execute(
      { isoId, merchantId },
      rules
    )

    const response = wrap(result)
    return res.response(response).code(201)
  } catch (err) {
    logger.error({ err }, 'error-to-register-revenue-rule')
    return errorApiResponse(err)
  }
}

const createByISO: ServerRoute = {
  path: '/iso/{isoId}/hash_revenue',
  method: 'POST',
  handler,
  options: {
    tags: ['api'],
    validate: {
      params: isoParams,
      payload: payloadOptions,
      failAction,
    },
    response: responseArray,
  },
}

const createByMerchant: ServerRoute = {
  path: '/merchant/{merchantId}/hash_revenue',
  method: 'POST',
  handler,
  options: {
    tags: ['api'],
    validate: {
      params: merchantParams,
      payload: payloadOptions,
      failAction,
    },
    response: responseArray,
  },
}

const HashRevenueRoutes = { createByISO, createByMerchant }

export { HashRevenueRoutes }
