import * as Joi from 'joi'

const responseObject = { schema: Joi.object().label('ResponseObject') }

const responseArray = {
  schema: Joi.array()
    .items(Joi.object().label('ResponseObject'))
    .label('ResponseArray'),
}

export { responseObject, responseArray }
