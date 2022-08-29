import * as Joi from 'joi'

const options = {
  percentage: Joi.number().integer(),
  flat: Joi.number().integer(),
  matchingRule: Joi.object().required(),
}

const isoOptions = {
  ...options,
  useSplitValues: Joi.boolean(),
}

const createSchema = (
  schema: Joi.PartialSchemaMap,
  label: string
): Joi.ObjectSchema => {
  return Joi.object(schema)
    .or('percentage', 'flat')
    .prefs({ convert: false })
    .label(label)
}

const payloadOptions = Joi.array()
  .items(createSchema(options, 'HashRevenueRule'))
  .label('HashRevenueRules')

const isoPayloadOptions = Joi.array()
  .items(createSchema(isoOptions, 'IsoRevenueRule'))
  .label('IsoRevenueRules')

export { payloadOptions, isoPayloadOptions }
