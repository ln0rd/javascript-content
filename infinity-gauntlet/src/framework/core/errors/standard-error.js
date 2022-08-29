import { translate } from 'framework/core/adapters/i18n'

export default class StandardError extends Error {
  constructor(statusCode, key, locale, opts = {}) {
    super()

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = new Error().stack
    }

    this.name = this.constructor.name
    this.public = true
    this.statusCode = statusCode || 500

    if (key && locale) {
      this.message = translate(key, locale, opts)
    }
  }
}
