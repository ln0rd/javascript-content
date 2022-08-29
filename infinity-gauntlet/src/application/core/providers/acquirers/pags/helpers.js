import PagsClient from '@hashlab/pags-client'
import { throwWithContext } from 'application/core/helpers/error'

import config from 'application/core/config'
import Provider from 'application/core/models/provider'

const { pags } = config.providers.acquirers

/**
 * Get a Pags client with credential
 *
 * @param {Object} credential Pags Credential
 *
 * @return Pags client
 */
function newClient(credential) {
  return new PagsClient({
    host: pags.api_url,
    email: credential.login,
    token: credential.affiliation_key
  })
}

/**
 * We use the Account Identifier sent as parameter to
 * identify which account's credentials should be
 * used in the client.
 *
 * @param {String} accountID The Pags account identifier
 * @param {*} credentials The Pags Credentials for the multiple accounts we have
 */
function getClient(accountID, credentials) {
  const pagsCredential = credentials.find(
    cred => cred.merchant_id === accountID
  )

  if (!pagsCredential) {
    throwWithContext(new Error('no-pags-credential-found-for-account-id'), {
      activationCode: accountID
    })
  }

  return new PagsClient({
    host: pags.api_url,
    email: pagsCredential.login,
    token: pagsCredential.affiliation_key
  })
}

/**
 * Extracts Pags-acquirer data from a specified Provider (or 'hash' provider, by default)
 *
 * @param {String} providerName The provider of which we will extract the `pags` credentials
 */
async function getPagsAcquirerFromProvider(providerName = 'hash') {
  const provider = await Provider.findOne({ name: providerName, enabled: true })
    .select({ acquirers: 1 })
    .lean()
    .exec()

  const acquirer = provider.acquirers.find(({ name }) => name === 'pags')

  if (!acquirer) {
    throwWithContext(new Error('no-pags-acquirer-in-provider'), { provider })
  }

  return acquirer
}

export { newClient, getClient, getPagsAcquirerFromProvider }
