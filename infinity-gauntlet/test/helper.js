import R from 'ramda'
import hippie from 'hippie'
import { join } from 'path'
import Promise from 'bluebird'
import nunjucks from 'nunjucks'
import config from 'application/core/config'
import { signJWT } from 'application/core/services/jwt'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'

// API Testing Client
export function apiWithHashKey(locale, hashKey) {
  return hippie()
    .base(process.env.API_URL)
    .header('Accept-Language', locale)
    .header('origin', 'http://localhost:3000')
    .auth('hash_key', hashKey)
}

export function apiWithJWTKey(locale, company, user) {
  return hippie()
    .base(process.env.API_URL)
    .header('Accept-Language', locale)
    .header('origin', 'http://localhost:3000')
    .auth('jwt', signJWT(company, user, {}))
}

export function apiWithJWTKeyWithoutOrigin(locale, company, user) {
  return hippie()
    .base(process.env.API_URL)
    .header('Accept-Language', locale)
    .auth('jwt', signJWT(company, user, {}))
}

export function api(locale) {
  return hippie()
    .base(process.env.API_URL)
    .header('Accept-Language', locale)
}

// Application helpers
export function renderTemplate(layout, template, metadata) {
  return Promise.resolve()
    .then(configure)
    .then(getTemplate)

  function configure() {
    nunjucks.configure(
      join(frameworkConfig.root_path, 'src', 'application', 'mailer'),
      { autoescape: true }
    )
  }

  function getTemplate() {
    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      return nunjucks.render(
        template,
        R.merge(
          {
            _t: translate,
            _layout: `layouts/${layout}.html`,
            _config: config,
            _frameworkConfig: frameworkConfig
          },
          metadata
        ),
        (err, result) => {
          if (err) {
            return reject(err)
          }

          return resolve(result)
        }
      )
    })
  }
}
