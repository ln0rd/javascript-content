import * as Joi from 'joi'

const antifraudDataOptions = Joi.object()
  .allow(null)
  .keys({
    name: Joi.string().allow(null),
    requestID: Joi.string().alphanum().allow(null),
    flaggedAsSuspicious: Joi.boolean().allow(null),
  })
  .label('AntifraudData')

const cardholderDataOptions = Joi.object()
  .required()
  .keys({
    panFirstDigits: Joi.string().required(),
    panLastDigits: Joi.string().required(),
    panSequenceNumber: Joi.string().length(3).allow(null),
    cardholderName: Joi.string().allow(null),
    cardExpirationDate: Joi.string().allow(null),
    verificationMethod: Joi.string().allow(null),
    issuerCountryCode: Joi.string().allow(null),
  })
  .label('CardHolderData')

const installmentTransactionDataOptions = Joi.object()
  .allow(null)
  .keys({
    installmentCount: Joi.number().positive().required(),
    installmentQualifier: Joi.string().allow(null),
  })
  .label('InstallmentTransactionData')

const paymentNetworkDataOptions = Joi.object()
  .required()
  .keys({
    name: Joi.string(),
    numericCode: Joi.string().length(3),
    alphaCode: Joi.string().length(3),
  })
  .label('PaymentNetworkData')

const paymentLinkDataOptions = Joi.object()
  .allow(null)
  .keys({
    creationTimestamp: Joi.string().allow(null),
  })
  .label('PaymentLinkData')

const captureChannelDataOptions = Joi.object()
  .allow(null)
  .keys({
    name: Joi.string().required(),
    paymentLinkData: paymentLinkDataOptions,
  })
  .label('CaptureChannelData')

const specificDataOptions = Joi.object()
  .allow(null)
  .keys({
    affiliationID: Joi.string().allow(null),
  })
  .label('SpecificData')

const authorizerDataOptions = Joi.object()
  .required()
  .keys({
    name: Joi.string().required(),
    uniqueID: Joi.string().allow(null),
    dateTime: Joi.string().isoDate().allow(null),
    responseCode: Joi.string().alphanum().required(),
    authorizationCode: Joi.string().alphanum().required(),
    specificData: specificDataOptions,
  })
  .label('AuthorizerData')

const transactionDataOptions = Joi.object()
  .keys({
    id: Joi.string().required(),
    hashCorrelationKey: Joi.string().uuid().required(),
    isoID: Joi.string().required(),
    merchantID: Joi.string().required(),
    merchantCategoryCode: Joi.string().required(),
    terminalID: Joi.string().allow(null),
    authorizerData: authorizerDataOptions,
    captureChannelData: captureChannelDataOptions,
    paymentNetworkData: paymentNetworkDataOptions,
    dateTime: Joi.string().isoDate().required(),
    transactionType: Joi.string().required(),
    accountType: Joi.string().required(),
    approved: Joi.boolean().required(),
    crossBorder: Joi.boolean().required(),
    entryMode: Joi.string().required(),
    amount: Joi.number().positive().required(),
    currencyCode: Joi.string().required(),
    installmentTransactionData: installmentTransactionDataOptions,
    cardholderData: cardholderDataOptions,
    referenceTransactionId: Joi.string().allow(null),
    antifraudData: antifraudDataOptions,
  })
  .label('TransactionData')

const transactionDataArrayOptions = Joi.array()
  .items(transactionDataOptions)
  .label('TransactionDataList')

export { transactionDataArrayOptions }
