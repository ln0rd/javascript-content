// import R from 'ramda'
import R from 'ramda'
import Promise from 'bluebird'
import { translate } from 'framework/core/adapters/i18n'
import Hashboard from 'application/core/models/hashboard'
import HashboardUrl from 'application/core/models/hashboard-url'
import HashboardDeployment from 'application/core/models/hashboard-deployment'
import HashboardDistribution from 'application/core/models/hashboard-distribution'
import { validate } from 'framework/core/adapters/validator'
import ValidationError from 'framework/core/errors/validation-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import {
  hashboardResponder,
  hashboardConfResponder
} from 'application/core/responders/hashboard'
import { hashboardDeploymentResponder } from 'application/core/responders/hashboard-deployment'
import { hashboardDistributionResponder } from 'application/core/responders/hashboard-distribution'
import { hashboardUrlResponder } from 'application/core/responders/hashboard-url'
import { hashboardConfigurationResponder } from 'application/core/responders/hashboard-configuration'
import {
  createInvalidation,
  s3GetHashboardFile
} from 'application/core/helpers/aws'
import HashboardUrlAlreadyExistsError from 'application/core/errors/hashboard-url-already-exists'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'IG_HASHBOARD_SERVICE'
})

export default class HashboardService {
  static getConfiguration(locale, reqUrl) {
    return Promise.resolve()
      .then(getConfig)
      .then(respond)

    function getConfig() {
      return HashboardUrl.findOne({
        enabled: true,
        url: reqUrl
      })
        .populate({
          path: 'hashboard',
          populate: { path: 'configuration' }
        })
        .lean()
        .exec()
    }

    function respond(response) {
      return hashboardConfigurationResponder(response)
    }
  }

  static getHashboard(locale, hashboardId) {
    return Promise.resolve()
      .then(getHashboard)
      .then(respond)

    function getHashboard() {
      const query = hashboardId ? { _id: hashboardId } : {}

      return Hashboard.find(query)
        .populate({
          path: 'deployments company',
          populate: { path: 'distributions' }
        })
        .lean()
        .exec()
    }

    function respond(response) {
      return hashboardResponder(response)
    }
  }

  static deleteHashboard(locale, hashboardId) {
    return Promise.resolve()
      .then(deleteHashboard)
      .then(respond)

    function deleteHashboard() {
      return Hashboard.deleteOne({ _id: hashboardId })
        .lean()
        .exec()
    }

    function respond() {
      return {
        success: true
      }
    }
  }

  static createHashboard(locale, params) {
    return Promise.resolve()
      .then(validateParams)
      .then(createHashboard)
      .then(populateHashboard)
      .then(respond)

    function validateParams() {
      const Errors = validate('request_create_hashboard', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function createHashboard() {
      return Hashboard.create(params)
    }

    function populateHashboard(hashboard) {
      return Hashboard.populate(hashboard, {
        path: 'deployments company',
        populate: { path: 'distributions' }
      })
    }

    function respond(response) {
      return hashboardResponder(response)
    }
  }

  static addUrl(locale, hashboardId, params) {
    return Promise.resolve()
      .then(validateParams)
      .then(getHashboard)
      .tap(checkHashboard)
      .then(addNewUrl)
      .then(respond)
      .catch(errorHandler)

    function validateParams() {
      const Errors = validate('request_hashboard_add_url', params)
      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getHashboard() {
      return Hashboard.findOne({ _id: hashboardId })
        .lean()
        .exec()
    }

    function checkHashboard(hashboard) {
      if (!hashboard) {
        throw new ModelNotFoundError(
          locale,
          translate('models.hashboard', locale)
        )
      }
    }

    function addNewUrl() {
      const urlConfig = R.pick(['url', 'enabled'], params)

      urlConfig.hashboard = hashboardId

      return HashboardUrl.create(urlConfig)
    }

    function respond(response) {
      return hashboardUrlResponder(response)
    }

    function errorHandler(err) {
      if (err.name === 'MongoError' && err.code === 11000) {
        throw new HashboardUrlAlreadyExistsError(locale)
      } else {
        throw err
      }
    }
  }

  static updateHashboard(locale, params, hashboardId) {
    return Promise.resolve()
      .then(validateParams)
      .then(createHashboard)
      .tap(checkHashboard)
      .then(respond)

    function validateParams() {
      const Errors = validate('request_create_hashboard', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function createHashboard() {
      return Hashboard.findOneAndUpdate(
        { _id: hashboardId },
        {
          $set: params
        },
        { new: true }
      )
        .populate({
          path: 'deployments company',
          populate: {
            path: 'distributions'
          }
        })
        .lean()
        .exec()
    }

    function checkHashboard(hashboard) {
      if (!hashboard) {
        throw new ModelNotFoundError(
          locale,
          translate('models.hashboard', locale)
        )
      }
    }

    function respond(response) {
      return hashboardResponder(response)
    }
  }

  static createDeployment(locale, params) {
    return Promise.resolve()
      .then(validateParams)
      .then(createDeployment)
      .then(populateDeployment)
      .then(respond)

    function validateParams() {
      const Errors = validate('request_create_hashboard_deployment', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function createDeployment() {
      return HashboardDeployment.create(params)
    }

    function populateDeployment(deployment) {
      return HashboardDeployment.populate(deployment, 'distributions')
    }

    function respond(response) {
      return hashboardDeploymentResponder(response, true)
    }
  }

  static updateDeployment(locale, params, deploymentId) {
    return Promise.resolve()
      .then(updateDeployment)
      .tap(checkDeployment)
      .then(respond)

    function updateDeployment() {
      return HashboardDeployment.findOneAndUpdate(
        { _id: deploymentId },
        { $set: params },
        { new: true }
      )
        .populate('distributions')
        .lean()
        .exec()
    }

    function checkDeployment(deployment) {
      if (!deployment) {
        throw new ModelNotFoundError(
          locale,
          translate('models.hashboardDeployment', locale)
        )
      }
    }

    function respond(response) {
      return hashboardDeploymentResponder(response, true)
    }
  }

  static deleteDeployment(locale, deploymentId) {
    return Promise.resolve()
      .then(deleteDeployment)
      .then(respond)

    function deleteDeployment() {
      return HashboardDeployment.deleteOne({ _id: deploymentId })
        .lean()
        .exec()
    }

    function respond() {
      return {
        success: true
      }
    }
  }

  static getDeployment(locale, deploymentId) {
    return Promise.resolve()
      .then(getDeployment)
      .tap(checkHashboard)
      .then(respond)

    function getDeployment() {
      const query = deploymentId ? { _id: deploymentId } : {}

      return HashboardDeployment.find(query)
        .populate('distributions')
        .lean()
        .exec()
    }

    function checkHashboard(hashboard) {
      if (!hashboard) {
        throw new ModelNotFoundError(
          locale,
          translate('models.hashboard', locale)
        )
      }

      return hashboard
    }

    function respond(response) {
      return hashboardDeploymentResponder(response, true)
    }
  }

  static createDistribution(locale, params) {
    return Promise.resolve()
      .then(validateParams)
      .then(createDistribution)
      .then(respond)

    function validateParams() {
      const Errors = validate('request_create_hashboard_distribution', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function createDistribution() {
      return HashboardDistribution.create(params)
    }

    function respond(response) {
      return hashboardDistributionResponder(response, true)
    }
  }

  static updateDistribution(locale, params, distributionId) {
    return Promise.resolve()
      .then(updateDistribution)
      .then(respond)

    function updateDistribution() {
      return HashboardDistribution.findOneAndUpdate(
        {
          _id: distributionId
        },
        { $set: params },
        {
          arrayFilters: [
            { 'dep._id': distributionId },
            { 'dist._id': distributionId }
          ]
        }
      )
        .lean()
        .exec()
    }

    function respond(response) {
      return hashboardDistributionResponder(response, true)
    }
  }

  static deleteDistribution(locale, distributionId) {
    return Promise.resolve()
      .then(deleteDeployment)
      .then(respond)

    function deleteDeployment() {
      return HashboardDistribution.deleteOne({
        _id: distributionId
      })
        .lean()
        .exec()
    }

    function respond() {
      return {
        success: true
      }
    }
  }

  static getDistribution(locale, distributionId) {
    return Promise.resolve()
      .then(getDistribution)
      .then(respond)

    function getDistribution() {
      const query = distributionId ? { _id: distributionId } : {}

      return HashboardDistribution.find(query)
        .lean()
        .exec()
    }

    function respond(response) {
      return hashboardDistributionResponder(response, true)
    }
  }

  static invalidateCache(locale, params) {
    const query = R.has('hashboardId', params)
      ? { _id: params.hashboardId }
      : {}

    if (R.has('company', params)) {
      query.company = params.company
    }

    if (R.has('environment', params)) {
      query['deployment.environment'] = params.environment
    }

    if (R.has('type', params)) {
      query['deployment.type'] = params.type
    }

    if (R.has('provider_id', params)) {
      query['deployment.distribution.provider_id'] = params.provider_id
    }

    return Promise.resolve()
      .then(getDistributions)
      .tap(checkHashboard)
      .tap(invalidateCache)
      .then(respond)

    function getDistributions() {
      return Hashboard.find(query)
        .populate({
          path: 'deployments',
          populate: { path: 'distributions' }
        })
        .lean()
        .exec()
    }

    function checkHashboard(hashboards) {
      if (hashboards.length === 0) {
        throw new ModelNotFoundError(
          locale,
          translate('models.hashboard', locale)
        )
      }
    }

    function invalidateCache(hashboards) {
      return Promise.resolve().then(parseDistributions)

      function parseDistributions() {
        const invalidations = []
        const distributions = []

        R.forEach(hashboard => {
          R.forEach(deployment => {
            R.forEach(distribution => {
              if (
                deployment.infrastructure_provider === 'amazon' &&
                distribution.provider === 'cloudfront' &&
                !distributions.includes(distribution.provider_id)
              ) {
                distributions.push(distribution.provider_id)
                invalidations.push(createInvalidation(distribution.provider_id))
              }
            }, deployment.distributions)
          }, hashboard.deployments)
        }, hashboards)

        return Promise.all(invalidations)
      }
    }

    function respond() {
      return {
        success: true
      }
    }
  }

  static async getConfigFile(locale, { origin }, authenticated) {
    const errMessage = 'Hashboard config file not found'
    try {
      const urlMap = await s3GetHashboardFile('config/url.index.json')

      if (!origin) {
        throw new Error('missing origin parameter')
      }

      const { hostname } = new URL(origin)
      const configFileName =
        urlMap[hostname] || urlMap[hostname.split('.')[0]] || null

      if (!configFileName) {
        throw new Error(errMessage)
      }

      const response = await s3GetHashboardFile(
        `config/${configFileName}.config.json`
      )

      return hashboardConfResponder(response, authenticated)
    } catch (err) {
      Logger.error({ err, origin }, 'hashboard-get-config')
      throw new ModelNotFoundError(locale, errMessage)
    }
  }
}
