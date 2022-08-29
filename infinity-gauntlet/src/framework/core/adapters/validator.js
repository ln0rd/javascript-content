import fs from 'fs'
import R from 'ramda'
import jjv from 'jjv'
import { join } from 'path'
import Promise from 'bluebird'
import config from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'VALIDATOR_ADAPTER' })

const SchemasBase = join(
  config.root_path,
  'build',
  'application',
  'core',
  'schemas'
)
const ValidatorsBase = join(
  config.root_path,
  'build',
  'application',
  'core',
  'validators'
)

const JJV = jjv()

export default function run() {
  return Promise.resolve()
    .tap(loadSchemas)
    .tap(loadValidators)

  function loadSchemas() {
    return Promise.resolve()
      .then(resolveSchemas)
      .each(loadSchemas)

    function resolveSchemas() {
      const ModelBasePath = join(SchemasBase, 'models')
      const RequestBasePath = join(SchemasBase, 'requests')

      return Promise.bind()
        .then(searchModelSchemas)
        .then(searchRequestSchemas)
        .spread(joinFiles)

      function searchModelSchemas() {
        Logger.debug('Searching for model schemas.')

        const DirList = fs.readdirSync(ModelBasePath)

        if (!DirList) {
          Logger.debug('No model schemas.')
          return []
        }

        return DirList
      }

      function searchRequestSchemas(modelDirList) {
        Logger.debug('Searching for request schemas.')

        const DirList = fs.readdirSync(RequestBasePath)

        if (!DirList) {
          Logger.debug('No request schemas.')
          return []
        }

        return [modelDirList, DirList]
      }

      function joinFiles(modelSchemas, requestSchemas) {
        return R.concat(
          R.map(file => join(ModelBasePath, file), modelSchemas),
          R.map(file => join(RequestBasePath, file), requestSchemas)
        )
      }
    }

    function loadSchemas(file) {
      const Schema = require(file).default

      if (!Schema) {
        throw new Error(
          `Invalid schema ${file}. Schemas should export a default object.`
        )
      }

      if (!R.pathOr(null, ['name'], Schema)) {
        throw new Error(
          `Invalid schema ${file}. Schemas should have a property 'name'.`
        )
      }

      if (!R.pathOr(null, ['schema'], Schema)) {
        throw new Error(
          `Invalid schema ${file}. Schemas should have a property 'schema'.`
        )
      }

      Logger.debug(`Loading schema => ${Schema.name}.`)

      return JJV.addSchema(Schema.name, Schema.schema)
    }
  }

  function loadValidators() {
    return Promise.resolve()
      .then(checkDir)
      .then(searchValidators)
      .each(loadValidator)

    function checkDir() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise(resolve => {
        fs.stat(ValidatorsBase, (err, stats) => {
          if (err) {
            return resolve(false)
          }

          if (!stats.isDirectory()) {
            return resolve(false)
          }

          return resolve(true)
        })
      })
    }

    function searchValidators(exists) {
      Logger.debug('Searching for validators.')

      if (!exists) {
        Logger.debug('No validators.')
        return []
      }

      return fs.readdirSync(ValidatorsBase)
    }

    function loadValidator(file) {
      const Validator = require(join(ValidatorsBase, file)).default

      if (!Validator) {
        throw new Error(
          `Invalid validator ${file}. Validators should export a default object.`
        )
      }

      if (!R.pathOr(null, ['name'], Validator)) {
        throw new Error(
          `Invalid validator ${file}. Validators should have a property 'name'.`
        )
      }

      if (!R.pathOr(null, ['type'], Validator)) {
        throw new Error(
          `Invalid validator ${file}. Validators should have a property 'type'.`
        )
      }

      if (!R.pathOr(null, ['handler'], Validator)) {
        throw new Error(
          `Invalid validator ${file}. Validators should have a property 'handler'.`
        )
      }

      if (!R.is(Function, Validator.handler)) {
        throw new Error(
          `Invalid validator ${file}. Validators handler should be a function.`
        )
      }

      Logger.debug(
        `Loading validator => ${Validator.name} of type '${Validator.type}'.`
      )

      switch (Validator.type) {
        case 'type':
          return JJV.addType(Validator.name, Validator.handler)
        case 'format':
          return JJV.addFormat(Validator.name, Validator.handler)
        case 'check':
          return JJV.addCheck(Validator.name, Validator.handler)
        case 'coercion':
          return JJV.addTypeCoercion(Validator.name, Validator.handler)
        default:
          throw new Error(
            `Invalid validator ${file}. Type should be either 'type', 'format', 'check' or 'coercion'.`
          )
      }
    }
  }
}

export function validate(name, object, options = {}) {
  return JJV.validate(
    name,
    object,
    R.merge({ removeAdditional: false }, options)
  )
}
