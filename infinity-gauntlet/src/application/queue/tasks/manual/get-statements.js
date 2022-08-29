import moment from 'moment'
import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import Provider from 'application/core/models/provider'
import config from 'application/core/config'
import payoutClient from '@hashlab/payout-client'

const Logger = createLogger({ name: 'GET_STATEMENTS_TASK' })

export default class GetStatements {
  static type() {
    return 'manual'
  }

  static handler() {
    return Promise.resolve()
      .then(findProviders)
      .then(providers => Promise.all(providers.map(p => findStatements(p))))

    function findProviders() {
      return Provider.find({
        provider_type: 'subacquirer',
        enabled: true
      })
        .lean()
        .exec()
    }

    function findStatements(provider) {
      return findPayoutsStatements(provider, buildSearchParams())
        .then(statements => {
          Logger.info(
            { payoutsStatements: JSON.stringify(statements) },
            'PayoutsStatements found'
          )
          return statements
        })
        .catch(err => {
          Logger.error({ err }, 'findPayoutsStatements error')

          return []
        })

      function buildSearchParams() {
        const requestDateFormat = 'YYYY-MM-DD[T]HH:mm:ss'
        return {
          startDate: moment()
            .subtract(1, 'days')
            .format(requestDateFormat),
          endDate: moment().format(requestDateFormat)
        }
      }

      function findPayoutsStatements(provider, search) {
        const client = payoutClient.createPayoutClient(
          config.services.payout_endpoint
        )

        const response = client.getStatementByDate({
          search,
          payoutProvider: {
            id: payoutClient.providers.NEON_PROD,
            credentials: buildProviderCredentials(provider)
          }
        })
        return response.then(({ transactionsList }) => transactionsList)

        function buildProviderCredentials(provider) {
          const NeonCredentials = provider.bank_provider.neon_credentials

          const CredentialsJson = JSON.stringify({
            TokenWs: NeonCredentials.auth_token,
            ChaveCriptografia: NeonCredentials.rsa_public_key.value,
            ChaveDescriptografia: NeonCredentials.rsa_private_key.value,
            Email: NeonCredentials.auth_username,
            Password: NeonCredentials.auth_password
          })

          return Buffer.from(CredentialsJson).toString('base64')
        }
      }
    }
  }
}
