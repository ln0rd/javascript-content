import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
import { CalculateBatch } from 'application/use-cases/calculate-batch'
import { TransactionData } from 'domain/model/transaction-data'
import errorApiResponse from 'errors/error-api-response'
import logger from 'infrastructure/logger'
import { failAction } from '../validations/fail-action'
import { responseArray } from '../validations/response-validation'
import { transactionDataArrayOptions } from '../validations/transaction-data-options'

const handler = async (request: Request, res: ResponseToolkit) => {
  const transactionDatas = request.payload as TransactionData[]

  try {
    const calculate = new CalculateBatch()
    const result = await calculate.execute(transactionDatas)
    return res.response(result).code(200)
  } catch (err) {
    logger.error({ err }, 'error-to-calculate-pricing-for-a-transaction')
    return errorApiResponse(err)
  }
}

const calculatePricing: ServerRoute = {
  path: '/calculate_pricing',
  method: 'POST',
  handler,
  options: {
    tags: ['api'],
    validate: {
      payload: transactionDataArrayOptions,
      failAction,
    },
    response: responseArray,
  },
}

const CalculatePricingRoutes = { calculatePricing }

export { CalculatePricingRoutes }
