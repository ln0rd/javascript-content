import { SplitInstruction } from 'domain/model/split-instruction'
import * as Joi from 'joi'

const percentageSumIs100 = (
  value: SplitInstruction[],
  helpers: Joi.CustomHelpers
) => {
  const total = value
    .map((i) => i.percentage)
    .reduce((sum: number, current: number) => sum + current, 0)

  return total === 10000000 ? value : helpers.error('any.invalid')
}

const splitInstructionsOptions = Joi.array()
  .items(
    Joi.object()
      .keys({
        merchantId: Joi.string().required(),
        percentage: Joi.number().integer().positive().required(),
      })
      .label('SplitInstruction')
  )
  .required()
  .custom(percentageSumIs100)
  .label('SplitInstructions')

const splitOptions = Joi.array()
  .label('Splits')
  .items(
    Joi.object()
      .keys({
        matchingRule: Joi.object().required().label('MatchingRule'),
        instructions: splitInstructionsOptions,
      })
      .label('Split')
  )
  .prefs({ convert: false })

export { splitOptions }
