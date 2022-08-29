const jjv = require('jjv')
const moment = require('moment')
const { SchemaValidatorError } = require('./schema-error')

const schema = jjv()

schema.addSchema('transaction', {
  type: 'array',
  items: {
    register_type: {
      type: 'string',
      enum: ['01', '02', '03', '04']
    },
    transaction_date: {
      type: 'string',
      minLength: 8,
      maxLength: 8
    },
    transaction_time: {
      type: 'string',
      minLength: 6,
      maxLength: 6
    },
    transaction_type: {
      type: 'string',
      minLength: 1,
      maxLength: 1
    },
    operation_code: {
      type: 'string',
      minLength: 2,
      maxLength: 2
    },
    gross_transaction_amount: {
      type: 'string',
      minLength: 13,
      maxLength: 13
    },
    installments: {
      type: 'string',
      minLength: 2,
      maxLength: 2
    },
    card_brand: {
      type: 'string',
      enum: ['001', '002', '003', '004', '005', '006', '999']
    },
    card_number: {
      type: 'string',
      minLength: 19,
      maxLength: 19
    },
    nsu: {
      type: 'string',
      minLength: 15,
      maxLength: 15
    },
    order_code: {
      type: 'string',
      minLength: 30,
      maxLength: 30
    },
    tid: {
      type: 'string',
      minLength: 20,
      maxLength: 20
    },
    authorization_code: {
      type: 'string',
      minLength: 15,
      maxLength: 15
    },
    capture_type: {
      type: 'string',
      minLength: 2,
      maxLength: 2
    },
    bank_code: {
      type: 'string',
      minLength: 4,
      maxLength: 4
    },
    bank_agency: {
      type: 'string',
      minLength: 5,
      maxLength: 5
    },
    bank_account: {
      type: 'string',
      minLength: 15,
      maxLength: 15
    },
    original_nsu: {
      type: 'string',
      minLength: 15,
      maxLength: 15
    },
    original_order_code: {
      type: 'string',
      minLength: 30,
      maxLength: 30
    },
    fix_reason: {
      type: 'string',
      minLength: 10,
      maxLength: 10
    },
    pos_rent: {
      type: 'string',
      minLength: 13,
      maxLength: 13
    },
    avg_ticket: {
      type: 'string',
      minLength: 1,
      maxLength: 1
    },
    original_transaction_date: {
      type: 'string',
      minLength: 8,
      maxLength: 8
    },
    total_installments: {
      type: 'string',
      minLength: 2,
      maxLength: 2
    },
    cost_gross_amount: {
      type: 'string',
      minLength: 13,
      maxLength: 13
    },
    net_transaction_amount: {
      type: 'string',
      minLength: 13,
      maxLength: 13
    },
    gross_installment_amount: {
      type: 'string',
      minLength: 13,
      maxLength: 13
    },
    installment_cost_amount: {
      type: 'string',
      minLength: 13,
      maxLength: 13
    },
    installment_net_amount: {
      type: 'string',
      minLength: 13,
      maxLength: 13
    },
    last_installment_payment_date: {
      type: 'string',
      minLength: 8,
      maxLength: 8
    },
    has_avg_ticket: {
      type: 'string',
      minLength: 1,
      maxLength: 1
    },
    operation_summary: {
      type: 'string',
      minLength: 20,
      maxLength: 20
    },
    percentage_applied: {
      type: 'string',
      minLength: 4,
      maxLength: 4
    },
    pdv: {
      type: 'string',
      minLength: 15,
      maxLength: 15
    }
  },
  required: [
    'register_type',
    'transaction_date',
    'transaction_time',
    'gross_transaction_amount',
    'total_installments',
    'card_number',
    'card_brand',
    'nsu',
    'order_code',
    'tid',
    'authorization_code',
    'original_nsu',
    'original_order_code',
    'original_payment_date',
    'total_installments',
    'cost_gross_amount',
    'net_transaction_amount',
    'gross_installment_amount',
    'installment_cost_amount',
    'installment_net_amount',
    'last_installment_payment_date',
    'capture_type',
    'bank_agency',
    'bank_account',
    'fix_reason',
    'pos_rent',
    'has_avg_ticket',
    'operation_summary',
    'percentage_applied',
    'pdv'
  ]
})

module.exports = class TurnoverSchema {
  /**
   * @param {Transaction} transaction - transaction model with limited fields used to conciliate
   * @param {Payable} payable - Payable's values used to conciliate
   * @param {Number} transaction._id
   * @param {String} transaction.status
   * @param {Date} transaction.acquirer_created_at
   * @param {Date} transaction.created_at
   * @param {Date} transaction.updated_at
   * @param {Number} transaction.installments
   * @param {Object} transaction.card
   * @param {String} transaction.payment_method
   * @param {Object} transaction.origin_company
   * @param {Object} transaction.merchant_split
   * @param {String} payable.type
   * @param {Number} payable.cost
   * @param {Number} payable.amount
   * @param {Number} payable.mdr_cost
   * @param {Number} payable.fee
   * @param {String} payable.payment_date
   */
  constructor(transaction, payable) {
    const {
      _id,
      acquirer_created_at,
      created_at,
      updated_at,
      card,
      payment_method,
      origin_company,
      merchant_split,
      status
    } = transaction
    const {
      type,
      cost,
      amount,
      mdr_cost,
      payout,
      fee,
      installment,
      total_installments,
      payment_date
    } = payable

    this.id = _id
    this.acquirer_created_at = acquirer_created_at
    this.created_at = created_at
    this.updated_at = updated_at
    this.total_installments = total_installments
    this.installment = installment
    this.card = card
    this.payment_method = payment_method
    this.company_document = origin_company ? origin_company.document_number : ''
    this.merchant_split = merchant_split
    this.type = type
    this.cost = cost
    this.fee = fee
    this.payableAmount = amount
    this.mdr_cost = mdr_cost
    this.payment_date = payment_date
    this.payout = payout
    this.transaction_status = status
  }

  /**
   * 01 - Register CV
   * 02 - ChargeBack
   * 03 - dispute
   * 04 - refunded
   * @return {string}
   */
  getRegisterType() {
    switch (this.type) {
      case 'refund':
        return '04'
      case 'chargeback_debit':
        return '02'
      default:
        return '01'
    }
  }

  /**
   * Return date was transacting or change
   * @return {moment.Moment}
   */
  getTransactionDate() {
    if (this.type === 'credit') {
      return moment(this.created_at)
    }
    return moment(this.updated_at)
  }

  /**
   * Return some amount value to Sequential file Currency Formatted
   * @param {number} amount
   * @param {number} maxLength
   * @return {string}
   */
  static formatCurrency(amount, maxLength = 13) {
    return (Math.abs(amount) / 100)
      .toFixed(2)
      .replace(/\./gi, ',')
      .padStart(maxLength, '0')
  }

  /**
   * Convert a number to a pre-filled with zero string
   * @param {number} value
   * @param {number} maxLength
   * @return {string}
   */
  static formatNumber(value, maxLength) {
    return String(value).padStart(maxLength, '0')
  }

  /**
   * Find merchant rule in the transaction and return amount
   * @return {number}
   */
  getSplitRuleAmount() {
    return this.merchant_split.amount || 0
  }

  /**
   * Number of installments
   * @return {number}
   */
  getInstallments() {
    return this.total_installments
  }

  /**
   * get current installment
   * @return {number}
   */
  getInstallment() {
    return this.installment
  }

  /**
   * Card Number masking
   * @return {string}
   */
  getCardNumber() {
    if (!this.card.first_digits) {
      return `${''.substr(0, 4)}*****${''.substr(0, 4)}`
    }
    return `${this.card.first_digits.substr(0, 4)}*****${this.card.last_digits}`
  }

  /**
   * Representative Number for card Brand
   * @return {number}
   */
  getCardBrand() {
    switch (this.card.brand) {
      case 'visa':
        return 1
      case 'mastercard':
        return 2
      case 'elo':
        return 3
      case 'hiper':
        return 4
      case 'amex':
        return 6
      default:
        return 9
    }
  }

  /**
   * Format id number to string and align to left,
   * if transaction status different than paid, complete with 900... on left side
   *
   * @param {number} id
   * @param {number} maxLength
   * @return {string}
   */
  formatIdIfRefunded(id, maxLength) {
    if (this.type === 'refund') {
      return `9${String(id).padStart(maxLength - 1, '0')}`
    }
    return String(id).padEnd(maxLength, ' ')
  }

  /**
   * Acquirer payment date
   * @return {moment.Moment}
   */
  getOriginalTransactionDate() {
    return moment(this.acquirer_created_at)
  }

  /**
   * Calculate Gross Cost amount
   * to be a tax and net amount agnostic
   * @return {*}
   */
  getGrossCostAmount() {
    const cost = this.cost || 0
    const fee = this.fee || 0
    return cost + fee
  }

  /**
   * Calculate amount with all costs
   * @return {number}
   */
  getNetTransactionAmount() {
    return this.getSplitRuleAmount() - this.getGrossCostAmount()
  }

  /**
   * Gross installment amount
   * @return {number}
   */
  getGrossInstallmentAmount() {
    return this.payableAmount
  }

  /**
   * Cost by installment
   * @return {number}
   */
  getCostByInstallment() {
    return this.mdr_cost + this.fee
  }

  /**
   * Net installment amount
   * @return {number}
   */
  getNetInstallmentAmount() {
    return this.payableAmount - this.getCostByInstallment()
  }

  /**
   * Method of payment: C when credit_card or D when debit
   * @return {string}
   */
  getTransactionType() {
    if (this.payment_method === 'credit_card') {
      return 'C'
    }
    return 'D'
  }

  /**
   * Operation Code:
   * 01 - Debit
   * 02 - Credit
   * 03 - Credit in installments
   * 04 - ChargeBack
   * 05 - other
   * @return {string}
   */
  getOperationCode() {
    if (this.transaction_status === 'chargedback') {
      return '04'
    }

    if (this.total_installments > 1) {
      return '03'
    }
    if (this.payment_method === 'credit_card') {
      return '02'
    }

    return '01'
  }

  /**
   * Administrative Cost
   * @return {number}
   */
  getPercentageApplied() {
    if (this.getSplitRuleAmount() === 0) {
      return 0
    }
    return Math.abs(
      this.getGrossCostAmount() / Math.abs(this.getSplitRuleAmount()) * 100
    )
  }

  /**
   * Merchant identifier
   * @return {string}
   */
  getPDV() {
    return String(this.company_document)
  }

  /**
   * return a reason message when refunded
   * @return {string}
   */
  getRefundReason() {
    return this.type !== 'credit' ? this.type : ''
  }

  /**
   * get Bank account info if settlement turnover
   * @return {{bank_code: string, bank_agency: string, bank_account: string}}}
   */
  getBankinfo() {
    if (!this.payout) {
      return {
        bank_code: '',
        bank_agency: '',
        bank_account: ''
      }
    }
    return {
      bank_code: this.payout.destination.bank_code,
      bank_agency: this.payout.destination.agencia,
      bank_account: this.payout.destination.conta
    }
  }

  /**
   * @return {string}
   */
  getOperationSummary() {
    return this.payout ? String(this.payout._id) : ''
  }

  /**
   * Return a object with transaction raw data to persist with their type
   * @return {Object}
   */
  toObject() {
    return {
      register_type: this.getRegisterType(),
      transaction_date: this.getTransactionDate(),
      transaction_time: this.getTransactionDate(),
      transaction_type: this.getTransactionType(),
      operation_code: this.getOperationCode(),
      gross_transaction_amount: this.getSplitRuleAmount(),
      cost_gross_amount: this.getGrossCostAmount(),
      installment_number: this.getInstallment(),
      total_installments: this.getInstallments(),
      net_transaction_amount: this.getNetTransactionAmount(),
      gross_installment_amount: this.getGrossInstallmentAmount(),
      installment_cost_amount: this.getCostByInstallment(),
      installment_net_amount: this.getNetInstallmentAmount(),
      last_installment_payment_date: moment(this.payment_date),
      card_number: this.getCardNumber(),
      card_brand: this.getCardBrand(),
      nsu: this.id,
      order_code: this.id,
      tid: this.id,
      authorization_code: '',
      capture_type: '01',
      bank_code: this.getBankinfo().bank_code,
      bank_agency: this.getBankinfo().bank_agency,
      bank_account: this.getBankinfo().bank_account,
      original_nsu: this.id,
      original_order_code: this.id,
      original_transaction_date: this.getOriginalTransactionDate(),
      refund_reason: this.getRefundReason(),
      pos_rent_amount: 0,
      has_average_ticket: 0,
      percentage_applied: this.getPercentageApplied(),
      operation_summary: this.getOperationSummary(),
      pdv: this.getPDV()
    }
  }

  /**
   * Return Array with structured data to conciliation sequential file
   * For more information about this fields:are been document here:
   * https://docs.google.com/spreadsheets/d/1OhcggNBuLDc8vk0XSyrS61hYZMpGImylOTiJ4VOsyrw/edit#gid=0
   * @throws {SchemaValidatorError}
   * @return {[]}
   */
  buildDataFile() {
    const transaction = this.toObject()
    const companyGenerated = [
      // Tipo de registro
      transaction.register_type,
      // Data Transação
      transaction.transaction_date.format('YYYYMMDD'),
      // Hora Transação
      transaction.transaction_time.format('HHmmss'),
      // Tipo de Lançamento
      transaction.transaction_type,
      // Código Operação
      transaction.operation_code,
      // Valor Bruto Transação
      TurnoverSchema.formatCurrency(transaction.gross_transaction_amount),
      // Valor Bruto Taxa
      TurnoverSchema.formatCurrency(transaction.cost_gross_amount),
      // Parcela
      TurnoverSchema.formatNumber(transaction.installment_number, 2),
      // Total Parcelas
      TurnoverSchema.formatNumber(transaction.total_installments, 2),
      // Valor Líquido Transação
      TurnoverSchema.formatCurrency(transaction.net_transaction_amount),
      // Valor Bruto Parcela
      TurnoverSchema.formatCurrency(transaction.gross_installment_amount),
      // Valor taxa/parcela
      TurnoverSchema.formatCurrency(transaction.installment_cost_amount),
      // Valor líquido parcela
      TurnoverSchema.formatCurrency(transaction.installment_net_amount),
      // Data Vencimento
      transaction.last_installment_payment_date.format('YYYYMMDD'),
      // Número Cartão
      transaction.card_number.padEnd(19, ' '),
      // Código de Bandeira
      TurnoverSchema.formatNumber(transaction.card_brand, 3),
      // NSU
      this.formatIdIfRefunded(transaction.nsu, 15),
      // Código Pedido
      this.formatIdIfRefunded(transaction.order_code, 30),
      // TID
      this.formatIdIfRefunded(transaction.tid, 20),
      // Código Autorização
      transaction.authorization_code.padEnd(15, ' '),
      // Tipo Captura
      transaction.capture_type,
      // Banco
      transaction.bank_code.padEnd(4, ' ').substring(0, 4),
      // Agência
      transaction.bank_agency.padEnd(5, ' ').substring(0, 5),
      // Conta Corrente
      transaction.bank_account.padEnd(15, ' ').substring(0, 15),
      // NSU Venda Original
      this.formatIdIfRefunded(transaction.original_nsu, 15),
      // Código Pedido Original
      this.formatIdIfRefunded(transaction.original_order_code, 30),
      // Data Transação original
      transaction.original_transaction_date.format('YYYYMMDD'),
      // Motivo Ajustes
      transaction.refund_reason.padEnd(10, ' ').substring(0, 10),
      // Aluguel POS
      TurnoverSchema.formatNumber(transaction.pos_rent_amount, 13),
      // Ticket Médio
      TurnoverSchema.formatNumber(transaction.has_average_ticket, 1),
      // Percentual aplicado
      TurnoverSchema.formatNumber(
        Math.round(transaction.percentage_applied),
        4
      ),
      // Resumo Operação
      transaction.operation_summary.padEnd(20, ' '),
      // PDV
      transaction.pdv.padEnd(15, ' ')
    ]

    const errors = schema.validate('transaction', companyGenerated)
    if (errors) {
      throw new SchemaValidatorError(errors)
    }
    return companyGenerated
  }

  /**
   * return a sequential text with turnover data
   * @return {string}
   */
  toSequentialText() {
    return `${Object.values(this.buildDataFile()).reduce(
      (text, item) => `${text}${item}`,
      ''
    )}\n`
  }
}
