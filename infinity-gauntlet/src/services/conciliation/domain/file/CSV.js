const { createObjectCsvStringifier } = require('csv-writer')
const { createLogger } = require('@hashlab/logger')
const FileError = require('./FileError')

const Logger = createLogger({ name: 'CONCILIATION_SERVICE' })

const header = [
  { id: 'register_type', title: 'Tipo de registro' },
  { id: 'transaction_date', title: 'Data Transação' },
  { id: 'transaction_time', title: 'Hora Transação' },
  { id: 'transaction_type', title: 'Tipo de Lançamento' },
  { id: 'operation_code', title: 'Código Operação' },
  { id: 'gross_transaction_amount', title: 'Valor Bruto Transação' },
  { id: 'cost_gross_amount', title: 'Valor Bruto Taxa' },
  { id: 'installment_number', title: 'Parcela' },
  { id: 'total_installments', title: 'Total Parcelas' },
  { id: 'net_transaction_amount', title: 'Valor Líquido Transação' },
  { id: 'gross_installment_amount', title: 'Valor Bruto Parcela' },
  { id: 'installment_cost_amount', title: 'Valor taxa/parcela' },
  { id: 'installment_net_amount', title: 'Valor líquido parcela' },
  { id: 'last_installment_payment_date', title: 'Data Vencimento' },
  { id: 'card_number', title: 'Número Cartão' },
  { id: 'card_brand', title: 'Código de Bandeira' },
  { id: 'nsu', title: 'NSU' },
  { id: 'order_code', title: 'Código Pedido' },
  { id: 'tid', title: 'TID' },
  { id: 'authorization_code', title: 'Código Autorização' },
  { id: 'capture_type', title: 'Tipo Captura' },
  { id: 'bank_code', title: 'Banco' },
  { id: 'bank_agency', title: 'Agência' },
  { id: 'bank_account', title: 'Conta Corrente' },
  { id: 'original_nsu', title: 'NSU Venda Original' },
  { id: 'original_order_code', title: 'Código Pedido Original' },
  { id: 'original_transaction_date', title: 'Data Transação original' },
  { id: 'refund_reason', title: 'Motivo Ajustes' },
  { id: 'pos_rent_amount', title: 'Aluguel POS' },
  { id: 'has_average_ticket', title: 'Ticket Médio' },
  { id: 'percentage_applied', title: 'Percentual aplicado' },
  { id: 'operation_summary', title: 'Resumo Operação' },
  { id: 'pdv', title: 'PDV' }
]

/**
 * Using header schema and a list of turnover to create a csv file
 * @param {[ObjectMap]} turnoverList - list of Turnover
 * @return {string}
 */
function createFile(turnoverList) {
  try {
    const csvStringifier = createObjectCsvStringifier({ header })
    return `${csvStringifier.getHeaderString()}${csvStringifier.stringifyRecords(
      turnoverList
    )}`
  } catch (err) {
    Logger.error(
      { conciliationList: turnoverList, err },
      'error-to-create-csv-file'
    )
    throw new FileError('csv')
  }
}

module.exports = {
  createFile
}
