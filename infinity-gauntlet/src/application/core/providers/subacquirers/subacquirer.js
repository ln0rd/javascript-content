import R from 'ramda'
import xml2js from 'xml2js'
import Promise from 'bluebird'
import config from 'application/core/config'
import uniqueId from 'application/core/helpers/unique-id'
import createLogger from 'framework/core/adapters/logger'
import Connector from 'application/core/providers/connector'
import Transaction from 'application/core/models/transaction'
import { validate } from 'framework/core/adapters/validator'
import ValidationError from 'framework/core/errors/validation-error'
import ProviderGenericError from 'application/core/errors/provider-generic-error'
import StoneGetHardwareError from 'application/core/errors/stone-get-hardware-error'
import InvalidProviderError from 'application/core/errors/invalid-provider-error'

const Logger = createLogger({ name: 'DEFAULT_SUBACQUIRER_PROVIDER' })

export default class DefaultSubAcquirer {
  constructor(locale) {
    this.locale = locale
  }

  async affiliateMerchant(provider, company, internal_provider) {
    validateParameters(this.locale, company)
    await processKYC()

    const acquirer = provider.acquirers
      .filter(({ enabled, name }) => enabled && typeof name === 'string')
      .find(({ name }) => name === internal_provider)

    if (!acquirer) {
      throw new InvalidProviderError(this.locale, internal_provider)
    }

    const internalMerchantId = await getInternalMerchantId()

    return respond(internalMerchantId)

    function validateParameters(locale, params) {
      const errors = validate('subacquirer_affiliation', params)

      if (errors) {
        throw new ValidationError(locale, errors)
      }
    }

    function processKYC() {
      return true
    }

    function getInternalMerchantId() {
      const filteredCredential = R.filter(credential => {
        return credential.enabled === true
      }, acquirer.credentials)

      return filteredCredential[0].merchant_id
    }

    function respond(internalMerchant) {
      return {
        merchant_id: uniqueId(),
        internal_provider: acquirer.name,
        provider_id: provider._id,
        internal_merchant_id: internalMerchant,
        status: 'active',
        provider_status_message: 'Aprovado',
        enabled: true
      }
    }
  }

  getAffiliation(affiliation) {
    return {
      provider_status_message: affiliation.provider_status_message
    }
  }

  /*
    If transaction was acquired by Hash Network, transaction internal provider to be used is 'cardprocessor'
    to use Transaction Service client.
  */
  getTransactionInternalProvider(transaction, affiliation) {
    if (!transaction) {
      return affiliation.internal_provider
    }

    if ('captured_by' in transaction) {
      return 'cardprocessor'
    }

    return affiliation.internal_provider
  }

  getTransaction(affiliation, transactionId, data) {
    /*
    Estanislau (2020.06.03) : Field to be used by transactions submitted from CardProcessor (or SalesLink) to
    by pass the request sent to Acquirer to retrieve some update about transaction.

    We don't have the Pags Transaction ID when a transaction is authorized through CardProcessor, this ID is submitted
    by Pags using the Webhook resource to notify a transaction event, but we decided not use it for transactions captured
    by TermAPI and CardProcessor.

    Another issue is the fact that today IG is not prepared to work with multiple Pags accounts, this issue will be solved
    by this PR: https://github.com/hashlab/infinity-gauntlet/pull/481/files
    */
    if ('captured_by_hash' in data && data.captured_by_hash) {
      return data
    }

    return Promise.bind(this)
      .tap(applyDefaults)
      .then(getTransaction)
      .spread(this.getTransactionInternalProvider)
      .then(sendToAcquirer)

    function applyDefaults() {
      affiliation.merchant_id = affiliation.internal_merchant_id
      data.__hardware_provider = 'hash'
    }

    function getTransaction() {
      return [
        Transaction.findOne({
          provider_transaction_id: transactionId,
          provider: affiliation.provider
        })
          .lean()
          .exec(),
        affiliation
      ]
    }

    function sendToAcquirer(transactionInternalProvider) {
      const Provider = Connector(this.locale, transactionInternalProvider)

      return Provider.getTransaction(affiliation, transactionId, data)
    }
  }

  getHardware(provider, serialNumber, affiliation) {
    // TO DO
    return Promise.bind(this)
      .then(formatBody)
      .then(sendRequest)
      .then(respond)
      .catch(errorHandler)

    function formatBody() {
      Logger.info('Formating body for getHardware.')

      const ContentToEncrypt = 'ListPagedTerminalDevices'

      const Signature = ContentToEncrypt

      const Body = {}

      // Add Credential
      Body.Credential = {
        UserId:
          config.providers.acquirers.stone.affiliation_credentials.user_id,
        Signature: Signature
      }

      Body.QueryExpression = {
        ConditionList: []
      }

      Body.QueryExpression.ConditionList.push({
        __type: 'Condition',
        LogicalOperator: 'And',
        Field: 'StoneCode',
        ComparisonOperator: 'Equals',
        Value: affiliation.merchant_id
      })

      Body.QueryExpression.ConditionList.push({
        __type: 'Condition',
        LogicalOperator: 'And',
        Field: 'SerialNumber',
        ComparisonOperator: 'Equals',
        Value: serialNumber
      })

      return Body
    }

    function sendRequest(formatedBody) {
      Logger.info('Sending the request to get hardware.')

      return this.affiliationClient.post(
        '/Merchant/MerchantService.svc/Merchant/ListTerminalDevices',
        formatedBody
      )
    }

    function respond(response) {
      const Result = {}

      response = response.data

      Logger.info('Response from getHarware: ', JSON.stringify(response))

      const DeviceList = R.pathOr(
        null,
        ['TerminalDeviceList', 0, 'Status'],
        response
      )

      if (DeviceList) {
        const Hardware = response.TerminalDeviceList[0]

        Result.status_code = Hardware.Status.Id
        Result.status_message = Hardware.Status.Name
        Result.serial_number = Hardware.SerialNumber
      }

      if (!R.has('status_code', Result)) {
        throw new StoneGetHardwareError(this.locale)
      }

      return Result
    }

    function errorHandler() {
      throw new StoneGetHardwareError(this.locale)
    }
  }

  getConciliationFile(provider, affiliationKey, date) {
    return Promise.bind(this)
      .then(sendRequest)
      .then(parseResponse)
      .then(respond)
      .catch(errorHandler)

    function sendRequest() {
      Logger.info('Sending the request to get conciliation file.')

      return this.conciliationClient.get(`/${date}`, {
        headers: {
          Authorization: affiliationKey
        }
      })
    }

    function parseResponse(response) {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        xml2js.parseString(response.data, (err, parsed) => {
          if (err) {
            return reject(err)
          }

          return resolve(parsed)
        })
      })
    }

    function respond(parsed) {
      return parsed
    }

    function errorHandler(err) {
      if (err.public) {
        throw err
      }

      Logger.error('A generic error has occurred on stone provider')
      Logger.error(err)

      throw new ProviderGenericError(this.locale, err, 'stone')
    }
  }

  createInternalTransfer(provider, from, to, amount, date, extra) {
    return Promise.bind(this)
      .then(formatBody)
      .then(sendRequest)
      .spread(respond)
      .catch(errorHandler)

    function formatBody() {
      Logger.info('Formating body for createInternalTransfer.')

      const Body = {
        PartIdentification: {
          InternalTransferSecurityKey: from.security_key,
          OriginMerchantAffiliationKey: from.key,
          TargetMerchantAffiliationKey: to.key
        },
        InternalTransfer: {
          AmountToTransfer: parseFloat(amount / 100).toFixed(2),
          PaymentDate: date
        }
      }

      if (extra) {
        Body.InternalTransfer.AdditionalData = extra
      }

      return Body
    }

    function sendRequest(formatedBody) {
      Logger.info('Sending the request to create internal transfer.')

      return [
        formatedBody,
        this.internalTransferClient.post(`/api/InternalTransfer`, formatedBody)
      ]
    }

    function respond(request, response) {
      response = response.data

      return {
        status: 'success',
        transfer_id: response.Data.TransferOrderKey
      }
    }

    function errorHandler(err) {
      if (err.public) {
        throw err
      }

      Logger.error('A generic error has occurred on stone provider')
      Logger.error(err)

      throw new ProviderGenericError(this.locale, err, 'stone')
    }
  }

  // ignoring provider, payable, affiliation
  processPayableRefund() {
    return true
  }

  registerTransaction(affiliation, transaction, providerTransaction) {
    return Promise.bind(this).then(respond)

    function respond() {
      providerTransaction.is_split_rule_processed = true
      return providerTransaction
    }
  }

  refundTransaction(amount, transaction, affiliation) {
    return Promise.bind(this)
      .tap(applyDefaults)
      .then(getTransaction)
      .spread(this.getTransactionInternalProvider)
      .then(sendToAcquirer)

    function applyDefaults() {
      affiliation.merchant_id = affiliation.internal_merchant_id
    }

    function getTransaction() {
      return [
        Transaction.findOne({
          provider_transaction_id: transaction.provider_transaction_id,
          provider: affiliation.provider
        })
          .lean()
          .exec(),
        affiliation
      ]
    }

    function sendToAcquirer(transactionInternalProvider) {
      const Provider = Connector(this.locale, transactionInternalProvider)

      return Provider.refundTransaction(amount, transaction, affiliation)
    }
  }

  // ignoring from, to, amount, date, extra
  createCharge() {
    return {
      status: 'success',
      processed: false
    }
  }

  async registerHardware(hardware, affiliation) {
    const Provider = Connector(this.locale, affiliation.internal_provider)
    // FIXME: Not sure if this a rawObject or a mongoose model
    // still mutating the merchat_id seems bad
    const subacquirerMerchantId = affiliation.merchant_id
    affiliation.merchant_id = affiliation.internal_merchant_id

    try {
      const providerHardware = await Provider.getHardware(
        hardware.serial_number,
        affiliation
      )
      if (providerHardware && providerHardware.status === 'active') {
        return { status: 'active' }
      }
    } catch (err) {
      err.context = { hardware, affiliation, subacquirerMerchantId }
      Logger.error({ err }, 'failed-to-get-provider-hardware-status')
    }

    return Provider.registerHardware(hardware, affiliation)
  }

  requiresProviderToAffiliate() {
    return false
  }

  requiresProviderToTransact() {
    return false
  }
}
