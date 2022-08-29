import Promise from 'bluebird'
import { translate } from 'framework/core/adapters/i18n'
import IntegrationConfig from 'application/core/models/integration-config'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import InvalidIntegrationError from 'application/core/errors/invalid-integration-error'
import { processIntegration as PeixeUrbanoIntegration } from 'application/core/integrations/peixeurbano'
import { processIntegration as LeoMadeirasIntegration } from 'application/core/integrations/sapleomadeiras'

export default function bridge(locale, name, integrationCredential, data) {
  return Promise.resolve()
    .then(getConfig)
    .tap(checkConfig)
    .then(getIntegration)

  function getConfig() {
    return IntegrationConfig.findOne({ name: name })
      .lean()
      .exec()
  }

  function checkConfig(config) {
    if (!config) {
      throw new ModelNotFoundError(
        locale,
        translate('models.integration_config', locale)
      )
    }
  }

  function getIntegration(config) {
    switch (name) {
      case 'peixeurbano':
        return PeixeUrbanoIntegration(
          locale,
          config.variables,
          integrationCredential,
          data
        )
      case 'sapleomadeiras':
        return LeoMadeirasIntegration(
          locale,
          config.variables,
          integrationCredential,
          data
        )
      default:
        throw new InvalidIntegrationError(locale, name)
    }
  }
}
