const test = require('ava')
const moment = require('moment')
const { createFile } = require('../../domain/file/CSV')

const turnoverList = [
  {
    register_type: '01',
    transaction_date: moment('2019-07-15T11:56:56.310Z'),
    transaction_time: moment('2019-07-15T11:56:56.310Z'),
    transaction_type: 'C',
    operation_code: '03',
    gross_transaction_amount: 20000,
    cost_gross_amount: 1592,
    installment_number: 10,
    total_installments: 10,
    net_transaction_amount: 18408,
    gross_installment_amount: 424,
    installment_cost_amount: 62,
    installment_net_amount: 362,
    last_installment_payment_date: moment('2020-05-11'),
    card_number: '5469*****9999',
    card_brand: 2,
    nsu: 9999999,
    order_code: 9999999,
    tid: 9999999,
    authorization_code: '',
    capture_type: '01',
    bank_code: '',
    bank_agency: '',
    bank_account: '',
    original_nsu: 9999999,
    original_order_code: 9999999,
    original_transaction_date: moment('2019-07-15T08:56:10'),
    refund_reason: '',
    pos_rent_amount: 0,
    has_average_ticket: 0,
    percentage_applied: 7.960000000000001,
    operation_summary: '',
    pdv: '14419777000999'
  }
]

test(`Test csv file creation`, t => {
  const headerExpected = `Tipo de registro,Data Transação,Hora Transação,Tipo de Lançamento,Código Operação,Valor Bruto Transação,Valor Bruto Taxa,Parcela,Total Parcelas,Valor Líquido Transação,Valor Bruto Parcela,Valor taxa/parcela,Valor líquido parcela,Data Vencimento,Número Cartão,Código de Bandeira,NSU,Código Pedido,TID,Código Autorização,Tipo Captura,Banco,Agência,Conta Corrente,NSU Venda Original,Código Pedido Original,Data Transação original,Motivo Ajustes,Aluguel POS,Ticket Médio,Percentual aplicado,Resumo Operação,PDV`
  const recordsExpected = `01,Mon Jul 15 2019 08:56:56 GMT-0300,Mon Jul 15 2019 08:56:56 GMT-0300,C,03,20000,1592,10,10,18408,424,62,362,Mon May 11 2020 00:00:00 GMT-0300,5469*****9999,2,9999999,9999999,9999999,,01,,,,9999999,9999999,Mon Jul 15 2019 08:56:10 GMT-0300,,0,0,7.960000000000001,,14419777000999`

  const file = createFile(turnoverList)
  t.is(file, `${headerExpected}\n${recordsExpected}\n`)
})
