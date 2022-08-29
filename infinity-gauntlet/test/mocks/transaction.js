import R from 'ramda'
import moment from 'moment'
import {
  BOLETO,
  CREDIT_CARD,
  DEBIT_CARD
} from 'application/core/domain/methods'

export const cardBrand = brand => ({
  card: { brand: brand },
  card_brand: brand
})

export const paymentMethod = name => ({ payment_method: name })

export const installments = num => ({ installments: num })

export const setAmount = num => ({ amount: num })

//****************************************************************************************************************//

export const withVisa = transaction => R.merge(transaction, cardBrand('visa'))

export const withVr = transaction => R.merge(transaction, cardBrand('vr'))

export const withAmount = (amount, transaction) =>
  R.merge(transaction, setAmount(amount))

export const withCredit = transaction =>
  R.merge(transaction, paymentMethod(CREDIT_CARD))

export const withDebit = transaction =>
  R.merge(transaction, paymentMethod(DEBIT_CARD))

export const withBoleto = transaction =>
  R.merge(transaction, paymentMethod(BOLETO))

export const withTwoInstallments = transaction =>
  R.merge(transaction, installments(2))

export const withOneInstallment = transaction =>
  R.merge(transaction, installments(1))

export const withTenInstallments = transaction =>
  R.merge(transaction, installments(10))

//****************************************************************************************************************//

export const transaction = (status = 'paid') => ({
  captured_at: moment('2018-11-13').toISOString(),
  amount: 100,
  transaction_id: 'uid',
  company_id: 'c_uid',
  provider: 'default',
  status
})

export const debitTransaction = () =>
  R.compose(withDebit, withTwoInstallments, withVisa)(transaction())

export const creditTransaction = () =>
  R.compose(withCredit, withTwoInstallments, withVisa)(transaction())

export const weirdAmountTransaction = amount =>
  R.compose(withAmount)(amount, transaction())

export const vrTransaction = () => R.compose(withVr)(transaction())

export const visaTransaction = () => R.compose(withVisa)(transaction())

export const boletoTransaction = ({ amount = transaction().amount }) =>
  R.compose(withBoleto, withOneInstallment)(weirdAmountTransaction(amount))
