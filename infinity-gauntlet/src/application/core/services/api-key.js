import R from 'ramda'
import Promise from 'bluebird'
import ApiKey from 'application/core/models/api-key'
import { generateUuidV4 } from 'application/core/helpers/uuid'
import { encryptPasswordV2 } from 'application/core/helpers/password'
import { apiKeyResponder } from 'application/core/responders/api-key'
import { validate } from 'framework/core/adapters/validator'
import RequiredParameterError from 'framework/core/errors/required-parameter-error'

export default class ApiKeyService {
  static createApiKey(locale, params, companyId) {
    let apiKeyData = {
      company: companyId
    }

    return Promise.resolve()
      .then(validateRequest)
      .then(createApiKey)
      .then(respond)

    function validateRequest() {
      const Errors = validate('request_create_api_key', params)

      if (Errors) {
        throw new RequiredParameterError(locale, Errors)
      }
    }

    function createApiKey() {
      apiKeyData = Object.assign(params, apiKeyData)

      return Promise.resolve()
        .then(generateKey)
        .then(generateSecret)
        .then(createKey)
        .then(populateKey)

      function generateKey() {
        apiKeyData.key = generateUuidV4()
      }

      function generateSecret() {
        const secret = generateUuidV4()

        apiKeyData.raw_secret = secret
        apiKeyData.masked_secret = `${secret.split('-').shift()}********`

        return encryptPasswordV2(secret)
      }

      function createKey(secret) {
        apiKeyData.secret = secret

        return ApiKey.create(apiKeyData)
      }

      function populateKey(apiKey) {
        return ApiKey.populate(apiKey, {
          path: 'permissions',
          populate: { path: 'create read update delete' }
        })
      }
    }

    function respond(response) {
      // That's the only moment we'll return the secret, since the encrypted one is stored
      response.secret = apiKeyData.raw_secret

      return apiKeyResponder(response, true)
    }
  }

  static getApiKey(locale, params, companyId) {
    return Promise.resolve()
      .then(getApiKeys)
      .then(respond)

    function getApiKeys() {
      const query = {
        company: companyId
      }

      if (R.has('api_key', params)) {
        query._id = params['api_key']
      }

      return ApiKey.find(query)
        .populate({
          path: 'permissions',
          populate: { path: 'create read update delete' }
        })
        .lean()
        .exec()
    }

    function respond(apiKeys) {
      return apiKeyResponder(apiKeys)
    }
  }

  static updateApiKey(locale, params, apiKey, companyId) {
    return Promise.resolve()
      .then(updateApiKey)
      .then(respond)

    function updateApiKey() {
      const apiData = R.pick(
        ['name', 'description', 'permissions', 'enabled'],
        params
      )

      return ApiKey.findOneAndUpdate(
        { _id: apiKey, company: companyId },
        {
          $set: apiData
        },
        { new: true }
      )
        .populate({
          path: 'permissions',
          populate: { path: 'create read update delete' }
        })
        .lean()
        .exec()
    }

    function respond(response) {
      return apiKeyResponder(response, true)
    }
  }

  static deleteApiKey(locale, apiKey, companyId) {
    return Promise.resolve()
      .then(deleteApiKey)
      .then(respond)

    function deleteApiKey() {
      return ApiKey.deleteOne({ _id: apiKey, company: companyId })
        .lean()
        .exec()
    }

    function respond() {
      return {
        success: true
      }
    }
  }
}
