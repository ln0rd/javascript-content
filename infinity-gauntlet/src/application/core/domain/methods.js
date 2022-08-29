export const EMV = 'emv'
export const MAGSTRIPE = 'magstripe'
export const ECOMMERCE = 'ecommerce'
export const CONTACTLESS_ICC = 'contactless_icc'

export const CREDIT_CARD = 'credit_card'
export const DEBIT_CARD = 'debit_card'
export const BOLETO = 'boleto'
export const MONEY = 'money'

export const captureMethodsEnum = {
  type: String,
  enum: [EMV, MAGSTRIPE, ECOMMERCE, CONTACTLESS_ICC],
  required: true
}

export const paymentMethodsEnum = {
  type: String,
  required: true,
  enum: [CREDIT_CARD, DEBIT_CARD, BOLETO, MONEY]
}
