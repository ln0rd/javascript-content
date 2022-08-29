import fs from 'fs'
import R from 'ramda'
import i18n from 'i18n'
import Promise from 'bluebird'
import config from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'I18N_ADAPTER' })

export default function run() {
  return Promise.resolve()
    .then(findLocales)
    .then(mapFiles)
    .then(validateJSON)
    .then(configure)
    .catch(SyntaxError, syntaxErrorHandler)

  function findLocales() {
    Logger.debug('Reading locales.')

    return fs.readdirSync(config.core.i18n.directory)
  }

  function mapFiles(files) {
    Logger.debug('Mapping locales.')

    return R.map(f => {
      const FilePath = `${config.core.i18n.directory}/${f}`

      if (!fs.statSync(FilePath).isFile()) {
        return null
      }

      return fs.readFileSync(FilePath, 'utf8')
    }, files)
  }

  function validateJSON(locales) {
    Logger.debug('Validating locales.')

    return R.map(l => JSON.parse(l), locales)
  }

  function configure() {
    Logger.debug('Configuring i18n adapter.')

    return i18n.configure({
      locales: config.core.i18n.locales,
      defaultLocale: config.core.i18n.defaultLocale,
      extension: config.core.i18n.extension,
      objectNotation: config.core.i18n.objectNotation,
      updateFiles: config.core.i18n.updateFiles,
      directory: config.core.i18n.directory
    })
  }

  function syntaxErrorHandler() {
    throw new Error('A syntax error was found in the locales')
  }
}

export function middleware(req, res, next) {
  const Locale = (req.header('Accept-Language') || '').split('-')[0]
  const HasLocale = R.contains(Locale, i18n.getLocales())

  if (HasLocale) {
    req.set('locale', Locale)
    return next()
  }

  req.set('locale', config.core.i18n.defaultLocale)
  return next()
}

export function translate(key, locale, opts) {
  return i18n.__(
    {
      phrase: key,
      locale: locale || config.core.i18n.defaultLocale
    },
    opts
  )
}

export function pluralize(key, locale, count) {
  return i18n.__n(
    {
      singular: key,
      plural: key,
      locale: locale || config.core.i18n.defaultLocale
    },
    count
  )
}
