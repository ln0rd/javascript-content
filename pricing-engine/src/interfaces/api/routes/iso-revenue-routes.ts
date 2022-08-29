import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
import { RegisterIsoRevenueRule } from 'application/use-cases/register-iso-revenue-rule'
import {
  IsoRevenueRule,
  IsoRevenueRuleParams,
} from 'domain/model/iso-revenue-rule'
import errorApiResponse from 'errors/error-api-response'
import logger from 'infrastructure/logger'
import { failAction } from 'interfaces/api/validations/fail-action'
import {
  isoParams,
  merchantParams,
} from 'interfaces/api/validations/param-options'
import { isoPayloadOptions } from 'interfaces/api/validations/revenue-payload-options'
import { responseArray } from '../validations/response-validation'

interface IsoRevenueRulePayloadItem {
  percentage?: number
  useSplitValues?: boolean
  flat?: number
  matchingRule: { [key in string]? }
}

const unwrap = (
  payload: IsoRevenueRulePayloadItem[]
): IsoRevenueRuleParams[] => {
  return payload.map<IsoRevenueRuleParams>((item) => ({
    percentage: item.percentage,
    useSplitValues: item.useSplitValues,
    flat: item.flat,
    matchingRule: item.matchingRule,
  }))
}

const wrap = (rules: IsoRevenueRule[]): IsoRevenueRulePayloadItem[] => {
  return rules.map<IsoRevenueRulePayloadItem>((rule) => ({
    id: rule.id ?? undefined,
    isoId: rule.isoId ?? undefined,
    merchantId: rule.merchantId ?? undefined,
    pricingGroupId: rule.pricingGroupId ?? undefined,
    percentage: rule.percentage ?? undefined,
    useSplitValues: rule.useSplitValues ?? undefined,
    flat: rule.flat ?? undefined,
    matchingRule: rule.matchingRule,
    createdAt: rule.createdAt?.toISOString(),
  }))
}

const handler = async (request: Request, res: ResponseToolkit) => {
  const { isoId, merchantId } = request.params
  const payloadItems = request.payload as IsoRevenueRulePayloadItem[]

  const rules: IsoRevenueRuleParams[] = unwrap(payloadItems)

  try {
    const useCase = new RegisterIsoRevenueRule()
    const result = await useCase.execute({ isoId, merchantId }, rules)

    const response = wrap(result)

    return res.response(response).code(201)
  } catch (err) {
    logger.error({ err }, 'error-to-register-revenue-rule')
    return errorApiResponse(err)
  }
}

const isoRevenueForIso: ServerRoute = {
  path: '/iso/{isoId}/iso_revenue',
  method: 'POST',
  handler,
  options: {
    tags: ['api'],
    validate: {
      params: isoParams,
      payload: isoPayloadOptions,
      failAction,
    },
    response: responseArray,
  },
}

const isoRevenueForMerchant: ServerRoute = {
  path: '/merchant/{merchantId}/iso_revenue',
  method: 'POST',
  handler,
  options: {
    tags: ['api'],
    validate: {
      params: merchantParams,
      payload: isoPayloadOptions,
      failAction,
    },
    response: responseArray,
  },
}

const IsoRevenueRoutes = { isoRevenueForIso, isoRevenueForMerchant }

export { IsoRevenueRoutes }
