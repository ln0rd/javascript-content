const test = require('ava')
const moment = require('moment')
const TurnoverSchema = require('../../domain/schema/TurnoverSchema')
const generatePayableWithTransaction = require('../fixtures/generatePayableWithTransaction')

test('Validate conciliation content size of the TurnoverSchema', t => {
  const payable = generatePayableWithTransaction({})
  const transaction = payable.transaction
  const turnoverSchema = new TurnoverSchema(transaction, payable)

  const contentSize = turnoverSchema
    .buildDataFile()
    .reduce((acc, item) => acc + item.length, 0)

  t.is(contentSize, 353)
})

test('Validate Conciliation content of the TransactionSchema', t => {
  const payable = generatePayableWithTransaction({
    _id: '9999999',
    transaction_id: 8888888,
    payout_id: 818776
  })
  const transaction = payable.transaction
  const turnoverSchema = new TurnoverSchema(transaction, payable)

  t.deepEqual(turnoverSchema.buildDataFile(), [
    '01',
    '20200213',
    '104438',
    'C',
    '02',
    '0000000010,00',
    '0000000000,15',
    '01',
    '01',
    '0000000009,85',
    '0000000001,00',
    '0000000000,15',
    '0000000000,85',
    '20200316',
    '9569*****6972      ',
    '002',
    '8888888        ',
    '8888888                       ',
    '8888888             ',
    '               ',
    '01',
    '922 ',
    '1753 ',
    '53276          ',
    '8888888        ',
    '8888888                       ',
    '20200213',
    '          ',
    '0000000000000',
    '0',
    '0002',
    '818776              ',
    '999999999999999'
  ])
})

test('Validate Conciliation concrete content of the TransactionSchema', t => {
  const payable = generatePayableWithTransaction({
    _id: '9999999',
    transaction_id: 8888888,
    payout_id: 818776
  })
  const transaction = payable.transaction
  const turnoverSchema = new TurnoverSchema(transaction, payable)

  t.deepEqual(turnoverSchema.toObject(), {
    register_type: '01',
    transaction_date: moment('2020-02-13T13:44:38.178Z'),
    transaction_time: moment('2020-02-13T13:44:38.178Z'),
    transaction_type: 'C',
    operation_code: '02',
    gross_transaction_amount: 1000,
    cost_gross_amount: 15,
    installment_number: 1,
    total_installments: 1,
    net_transaction_amount: 985,
    gross_installment_amount: 100,
    installment_cost_amount: 15,
    installment_net_amount: 85,
    last_installment_payment_date: moment('2020-03-16'),
    card_number: '9569*****6972',
    card_brand: 2,
    nsu: 8888888,
    order_code: 8888888,
    tid: 8888888,
    authorization_code: '',
    capture_type: '01',
    bank_account: '53276',
    bank_agency: '1753',
    bank_code: '922',
    original_nsu: 8888888,
    original_order_code: 8888888,
    original_transaction_date: moment(transaction.acquirer_created_at),
    refund_reason: '',
    pos_rent_amount: 0,
    has_average_ticket: 0,
    percentage_applied: 1.5,
    operation_summary: '818776',
    pdv: '999999999999999'
  })
})

test('Validate conciliation with 10 installments', t => {
  const payable = generatePayableWithTransaction({
    _id: '9999999',
    transaction_id: 8888888,
    payout_id: 818776,
    installments: 10
  })
  const transaction = payable.transaction
  const turnoverSchema = new TurnoverSchema(transaction, payable)

  const {
    installment_number,
    total_installments: totalInstallmentsExpected,
    cost_gross_amount,
    installment_cost_amount,
    net_transaction_amount
  } = turnoverSchema.toObject()

  t.is(installment_number, 1)
  t.is(totalInstallmentsExpected, 10)
  t.is(cost_gross_amount, 15)
  t.is(installment_cost_amount, 15)
  t.is(net_transaction_amount, 985)
})

test('Validate conciliation when transaction is chargedback', t => {
  const payable = generatePayableWithTransaction({
    _id: '9999999',
    transaction_id: 8888888,
    payout_id: 818776,
    installments: 10,
    transaction_status: 'chargedback',
    payables_type: 'chargeback_debit'
  })

  const transaction = payable.transaction
  const turnoverSchema = new TurnoverSchema(transaction, payable)

  const result = turnoverSchema.toObject()

  t.is(result.operation_code, '04')
  t.is(result.register_type, '02')
})

test('Validate Conciliation file content of the TransactionSchema for chargedback transactions', t => {
  const payable = generatePayableWithTransaction({
    _id: '9999999',
    transaction_id: 8888888,
    payout_id: 818776,
    installments: 10,
    transaction_status: 'chargedback',
    payables_type: 'chargeback_debit'
  })
  const transaction = payable.transaction
  const turnoverSchema = new TurnoverSchema(transaction, payable)

  t.deepEqual(turnoverSchema.buildDataFile(), [
    '02',
    '20200213',
    '104438',
    'C',
    '04',
    '0000000010,00',
    '0000000000,15',
    '01',
    '10',
    '0000000009,85',
    '0000000001,00',
    '0000000000,15',
    '0000000000,85',
    '20200316',
    '9569*****6972      ',
    '002',
    '900000008888888',
    '900000000000000000000008888888',
    '90000000000008888888',
    '               ',
    '01',
    '922 ',
    '1753 ',
    '53276          ',
    '900000008888888',
    '900000000000000000000008888888',
    '20200213',
    'chargeback',
    '0000000000000',
    '0',
    '0002',
    '818776              ',
    '999999999999999'
  ])
})
