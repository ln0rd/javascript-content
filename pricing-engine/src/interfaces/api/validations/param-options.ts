import * as Joi from 'joi'

const isoParams = Joi.object({
  isoId: Joi.string().required(),
}).label('IsoParams')

const merchantParams = Joi.object({
  merchantId: Joi.string().required(),
}).label('MerchantParams')

export { isoParams, merchantParams }
