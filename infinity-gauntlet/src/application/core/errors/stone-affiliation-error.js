import R from 'ramda'
import StandardError from 'framework/core/errors/standard-error'

export default class StoneAffiliationError extends StandardError {
  constructor(locale, errors) {
    super(400, 'errors.stone_affiliation', locale, errors[0].Message)

    const Name = this.name

    this.list = R.map(err => {
      return {
        type: Name,
        parameter_name: 'company',
        message: err.Message
      }
    }, errors)
  }
}
