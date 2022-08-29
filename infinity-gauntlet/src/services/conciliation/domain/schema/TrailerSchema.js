const jjv = require('jjv')
const { SchemaValidatorError } = require('./schema-error')

const schema = jjv()

schema.addSchema('trailer', {
  type: 'object',
  items: {
    type_record: {
      type: 'string',
      minLength: 2,
      maxLength: 2
    },
    content_length: {
      type: 'string',
      minLength: 10,
      maxLength: 10
    }
  },
  required: ['type_record', 'content_length']
})

module.exports = class TrailerSchema {
  constructor(contentLength) {
    this.contentLength = contentLength
  }

  static getTypeRecord() {
    return 'TH'
  }

  getLinesLength() {
    return String(this.contentLength).padStart(10, '0')
  }

  toObject() {
    return {
      type_record: TrailerSchema.getTypeRecord(),
      content_length: this.contentLength
    }
  }

  /**
   * @return {{}}
   */
  buildToPerformConciliation() {
    const { type_record } = this.toObject()
    const trailerToConciliate = {
      type_record,
      content_length: this.getLinesLength()
    }

    const errors = schema.validate('trailer', trailerToConciliate)
    if (errors) {
      throw new SchemaValidatorError(errors)
    }
    return trailerToConciliate
  }

  /**
   * return a sequential text with trailer data
   * @return {string}
   */
  toSequentialText() {
    return Object.values(this.buildToPerformConciliation()).reduce(
      (text, item) => `${text}${item}`,
      ''
    )
  }
}
