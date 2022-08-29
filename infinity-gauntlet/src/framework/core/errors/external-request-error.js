import R from 'ramda'
import StandardError from 'framework/core/errors/standard-error'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'EXTERNAL_REQUEST_ERROR' })

export default class ExternalRequestError extends StandardError {
  constructor(statusCode, key, locale, err, opts = {}) {
    super(statusCode, key, locale, opts)

    this.previousMessage = err.message
    this.previousStack = err.stack

    if (err.response) {
      this.response = {
        data: R.pathOr(
          'No data was returned from the request',
          ['response', 'data'],
          err
        ),
        status: R.pathOr(
          'No status was returned from the request',
          ['response', 'status'],
          err
        ),
        headers: R.pathOr(
          'No headers was returned from the request',
          ['response', 'headers'],
          err
        )
      }
    } else if (err.request) {
      this.request = 'The request was made but no response was received.'
    }

    if (err.config) {
      this.config = err.config
    }

    Logger.error(
      {
        context: {
          response: this.response,
          request: this.request,
          config: {
            baseURL: this.config.baseURL,
            url: this.config.url,
            method: this.config.method,
            headers: this.config.headers,
            params: this.config.params,
            data: this.config.data
          },
          error: {
            message: err.message,
            stack: err.stack
          }
        }
      },
      'An external request error has occurred!'
    )
  }
}
