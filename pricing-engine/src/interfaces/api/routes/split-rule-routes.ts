import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
import { RegisterSplitRule } from 'application/use-cases/register-split-rule'
import { SplitRule, SplitRuleParams } from 'domain/model/split-rule'
import errorApiResponse from 'errors/error-api-response'
import logger from 'infrastructure/logger'
import { failAction } from 'interfaces/api/validations/fail-action'
import {
  isoParams,
  merchantParams,
} from 'interfaces/api/validations/param-options'
import { splitOptions } from 'interfaces/api/validations/split-payload-options'
import { responseArray } from '../validations/response-validation'

interface SplitInstructionsItem {
  merchantId: string
  percentage: number
}

interface SplitPayloadItem {
  id?: string
  isoId?: string
  merchantId?: string
  matchingRule: { [key in string]? }
  instructions: SplitInstructionsItem[]
  createdAt?: string
}

const unwrap = (payload: SplitPayloadItem[]): SplitRuleParams[] => {
  return payload.map<SplitRuleParams>((item) => ({
    matchingRule: item.matchingRule,
    instructions: item.instructions,
  }))
}

const wrap = (rules: SplitRule[]): SplitPayloadItem[] => {
  return rules.map<SplitPayloadItem>((rule) => ({
    id: rule.id ?? undefined,
    isoId: rule.isoId ?? undefined,
    merchantId: rule.merchantId ?? undefined,
    matchingRule: rule.matchingRule,
    instructions: rule.instructions.map<SplitInstructionsItem>((inst) => ({
      percentage: inst.percentage,
      merchantId: inst.merchantId,
    })),
    createdAt: rule.createdAt?.toISOString(),
  }))
}

const handler = async (request: Request, res: ResponseToolkit) => {
  const { isoId, merchantId } = request.params
  const payloadItems = request.payload as SplitPayloadItem[]

  const rules: SplitRuleParams[] = unwrap(payloadItems)

  try {
    const useCase = new RegisterSplitRule()
    const result = await useCase.execute({ isoId, merchantId }, rules)

    const response = wrap(result)

    return res.response(response).code(201)
  } catch (err) {
    logger.error({ err }, 'error-to-register-split-rule')
    return errorApiResponse(err)
  }
}

const splitForIso: ServerRoute = {
  path: '/iso/{isoId}/split',
  method: 'POST',
  handler,
  options: {
    tags: ['api'],
    validate: {
      params: isoParams,
      payload: splitOptions,
      failAction,
    },
    response: responseArray,
  },
}

const splitForMerchant: ServerRoute = {
  path: '/merchant/{merchantId}/split',
  method: 'POST',
  handler,
  options: {
    tags: ['api'],
    validate: {
      params: merchantParams,
      payload: splitOptions,
      failAction,
    },
    response: responseArray,
  },
}

const SplitRoutes = { splitForIso, splitForMerchant }

export { SplitRoutes }
