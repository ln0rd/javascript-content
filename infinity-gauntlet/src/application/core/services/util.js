import Cep from 'cep-promise'
import Promise from 'bluebird'
import InvalidParameterError from 'framework/core/errors/invalid-parameter-error'

export default class UtilService {
  static getZipCode(locale, zipCode) {
    return Promise.resolve()
      .then(get)
      .then(respond)
      .catch(errorHandler)

    function get() {
      return Cep(zipCode)
    }

    function respond(response) {
      return {
        object: 'zipcode',
        zipcode: response.cep,
        state: response.state,
        city: response.city,
        street: response.street,
        neighborhood: response.neighborhood
      }
    }

    function errorHandler() {
      throw new InvalidParameterError(locale, 'zipcode')
    }
  }
}
