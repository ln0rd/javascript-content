class SchemaValidatorError extends Error {
  constructor(jjvSchemaError) {
    const message = JSON.stringify(jjvSchemaError)
    super(message)

    Error.captureStackTrace(this, SchemaValidatorError)
  }
}

module.exports = {
  SchemaValidatorError
}
