const faker = require('faker')

/**
 * @param {String} _id
 * @param {Number} transaction_id
 * @param {Number} installment
 * @param {String} company_id
 * @param {Number} amount
 * @param {String} payment_date
 * @param {Number} cost
 * @param {Number} fee
 * @param {Number} payout_amount
 * @param {Number} installments
 * @param {Number} merchant_amount
 * @param {Number} transaction_amount
 */
module.exports = function generatePayableWithTransaction({
  _id = `${faker.random.number(999999)}`,
  transaction_id = faker.random.number(999999),
  installment = 1,
  company_id = `${faker.random.alphaNumeric(40)}`,
  amount = 100,
  cost = 10,
  fee = 5,
  payout_amount = 85,
  installments = 1,
  merchant_amount = 1000,
  transaction_amount = 2000,
  transaction_status = 'paid',
  payables_type = 'credit'
}) {
  const origin_company_id = `${faker.random.alphaNumeric(40)}`
  const payment_date = '2020-03-16'
  return {
    _id,
    transaction_id,
    installment,
    total_installments: installments,
    origin_company_id,
    company_id,
    amount,
    payment_date,
    mdr_cost: cost,
    cost,
    fee,
    settlement_id: `${faker.random.alphaNumeric(40)}`,
    type: payables_type,
    payout: {
      _id: 818776,
      amount: payout_amount,
      date: payment_date,
      company_id,
      destination: {
        bank_code: '922',
        agencia: '1753',
        conta: '53276'
      }
    },
    transaction: {
      _id: transaction_id,
      updated_at: '2020-02-13T13:44:38.295Z',
      created_at: '2020-02-13T13:44:38.178Z',
      acquirer_created_at: '2020-02-13T13:44:22.000Z',
      payment_method: 'credit_card',
      company_id: origin_company_id,
      status: transaction_status,
      merchant_split: {
        amount: merchant_amount,
        company_id,
        _id: `${faker.random.alphaNumeric(40)}`
      },
      origin_company: {
        _id: `${faker.random.alphaNumeric(40)}`,
        document_number: 999999999999999
      },
      nsu: null,
      split_rules: [
        {
          amount: merchant_amount,
          company_id
        },
        {
          amount: transaction_amount,
          company_id: origin_company_id
        }
      ],
      card: {
        first_digits: '95694',
        last_digits: '6972',
        brand: 'mastercard'
      }
    }
  }
}
