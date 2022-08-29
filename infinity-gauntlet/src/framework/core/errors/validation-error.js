import R from 'ramda'
import { translate } from 'framework/core/adapters/i18n'
import StandardError from 'framework/core/errors/standard-error'

function generateMessageKey(schema) {
  // Types
  if (schema.type === 'null') {
    return 'errors.validations.type_null'
  }
  if (schema.type === 'string') {
    return 'errors.validations.type_string'
  }
  if (schema.type === 'boolean') {
    return 'errors.validations.type_boolean'
  }
  if (schema.type === 'number') {
    return 'errors.validations.type_number'
  }
  if (schema.type === 'integer') {
    return 'errors.validations.type_integer'
  }
  if (schema.type === 'object') {
    return 'errors.validations.type_object'
  }
  if (schema.type === 'array') {
    return 'errors.validations.type_array'
  }
  if (schema.type === 'date') {
    return 'errors.validations.type_date'
  }
  // Formats
  if (schema.format) {
    return 'errors.validations.format'
  }
  // Validates
  if (schema.readOnly) {
    return 'errors.validations.read_only'
  }
  if (schema.minimum) {
    return 'errors.validations.minimum'
  }
  if (schema.maximum) {
    return 'errors.validations.maximum'
  }
  if (schema.multipleOf) {
    return 'errors.validations.multiple_of'
  }
  if (schema.pattern) {
    return 'errors.validations.pattern'
  }
  if (schema.minLength) {
    return 'errors.validations.min_length'
  }
  if (schema.maxLength) {
    return 'errors.validations.max_length'
  }
  if (schema.minItems) {
    return 'errors.validations.min_items'
  }
  if (schema.maxItems) {
    return 'errors.validations.max_items'
  }
  if (schema.uniqueItems) {
    return 'errors.validations.unique_items'
  }
  if (schema.minProperties) {
    return 'errors.min_properties'
  }
  if (schema.maxProperties) {
    return 'errors.validations.max_properties'
  }
  if (schema.constant) {
    return 'errors.validations.constant'
  }
  if (schema.enum) {
    return 'errors.validations.enum'
  }
  if (schema.required) {
    return 'errors.validations.required'
  }

  return 'errors.validations.default'
}

export default class ValidationError extends StandardError {
  constructor(locale, errors) {
    const ParameterName = R.keys(errors.validation)[0]
    const Schema = R.values(errors.validation)[0]

    super(400, generateMessageKey(Schema), locale, ParameterName)

    const Name = this.name

    this.parameterName = ParameterName
    this.schema = Schema
    // JJV errors object example:
    // {"validation":{"email":{"required":true},"password":{"required":true}}}
    this.list = R.addIndex(R.map)((val, key) => {
      return {
        type: Name,
        parameter_name: val,
        message: translate(
          generateMessageKey(R.values(errors.validation)[key]),
          locale,
          val
        )
      }
    }, R.keys(errors.validation))
  }
}
