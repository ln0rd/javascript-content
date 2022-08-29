const jjv = require('jjv')
const moment = require('moment')
const { SchemaValidatorError } = require('./schema-error')

const schema = jjv()

schema.addSchema('header', {
  type: 'array',
  items: {
    type_record: {
      type: 'string',
      minLength: 2,
      maxLength: 2
    },
    file_data_issue: {
      type: 'string',
      minLength: 8,
      maxLength: 8
    },
    acquirer_identifier: {
      type: 'string',
      minLength: 20,
      maxLength: 20
    },
    file_identifier: {
      type: 'string',
      minLength: 20,
      maxLength: 20
    },
    company_document: {
      type: 'string',
      minLength: 15,
      maxLength: 15
    },
    company_name: {
      type: 'string',
      minLength: 25,
      maxLength: 25
    },
    acquirer_code: {
      type: 'string',
      minLength: 3,
      maxLength: 3
    },
    status_type: {
      type: 'string',
      minLength: 2,
      maxLength: 2
    },
    currency: {
      type: 'string',
      minLength: 3,
      maxLength: 3
    },
    sequential_file_id: {
      type: 'string',
      minLength: 10,
      maxLength: 10
    }
  },
  required: [
    'type_record',
    'file_data_issue',
    'acquirer_identifier',
    'file_identifier',
    'company_document',
    'company_name',
    'acquirer_code',
    'status_type',
    'currency',
    'sequential_file_id'
  ]
})

module.exports = class HeaderSchema {
  constructor({ id, name, document_number, type }) {
    const [description, status] =
      type === 'sales'
        ? ['MOVIMENTO VENDAS', '00']
        : ['MOVIMENTO REPASSE', '01']

    this.file_id = id
    this.company_name = name
    this.company_document = document_number
    this.description = description
    this.status = status
  }

  /**
   * Receive a number and return a string with a requested size and string to fill
   *
   * @param {number} number
   * @param {number} maxLength
   * @param {string} fillString
   * @return {string}
   */
  static startNumberFormat(number, maxLength, fillString) {
    return String(number).padStart(maxLength, fillString)
  }

  toObject() {
    return {
      register_type: 'HD',
      issue_file_date: moment(),
      acquirer_identifier: 'HASHLAB',
      file_identifier: this.description,
      company_document: this.company_document,
      company_name: this.company_name,
      acquirer_code: '001',
      status_type: this.status,
      currency: 'BRL',
      file_id: this.file_id
    }
  }

  buildToPerformConciliation() {
    const {
      register_type,
      issue_file_date,
      acquirer_identifier,
      file_identifier,
      company_document,
      company_name,
      acquirer_code,
      status_type,
      currency,
      file_id
    } = this.toObject()

    const header = [
      register_type.padEnd(2, ' '),
      issue_file_date.format('YYYYMMDD'),
      acquirer_identifier.padEnd(20, ' '),
      file_identifier.padEnd(20, ' '),
      company_document.padEnd(15, ' '),
      company_name.padEnd(25, ' '),
      acquirer_code.padStart(3, '0'),
      status_type.padStart(2, '0'),
      currency.padEnd(3, ' '),
      HeaderSchema.startNumberFormat(file_id, 10, '0')
    ]

    const errors = schema.validate('header', header)
    if (errors) {
      throw new SchemaValidatorError(errors)
    }
    return header
  }

  /**
   * return a sequential text with header data
   * @return {string}
   */
  toSequentialText() {
    return `${this.buildToPerformConciliation().reduce(
      (text, item) => `${text}${item}`,
      ''
    )}\n`
  }
}
