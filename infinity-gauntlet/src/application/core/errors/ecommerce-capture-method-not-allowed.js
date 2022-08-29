import StandardError from 'framework/core/errors/standard-error'

export default class EcommerceCaptureMethodNotAllowed extends StandardError {
  constructor(locale) {
    super(400, 'errors.ecommerce_capture_method_not_allowed', locale)
  }
}
