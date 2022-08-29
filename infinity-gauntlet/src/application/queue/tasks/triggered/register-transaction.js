import Promise from 'bluebird'
import frameworkConfig from 'framework/core/config'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import TransactionService from 'application/core/services/transaction'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import RegisterTransactionTaskError from 'application/core/errors/register-transaction-task-error'

const Logger = createLogger({ name: 'REGISTER_TRANSACTION_TASK' })

export default class RegisterTransaction {
  static type() {
    return 'triggered'
  }

  static handler(msg) {
    return Promise.resolve()
      .then(parseMsg)
      .then(getCompany)
      .spread(sendRequest)

    function parseMsg() {
      Logger.debug('Parsing JSON.')

      return JSON.parse(msg)
    }

    function getCompany(parsedMsg) {
      Logger.debug('Getting Company.')

      return [
        parsedMsg,
        Company.findOne({
          hash_key: parsedMsg.hash_key
        })
          .lean()
          .exec()
      ]
    }

    function sendRequest(parsedMsg, company) {
      if (!company) {
        throw new ModelNotFoundError(
          frameworkConfig.core.i18n.defaultLocale,
          translate('models.company', frameworkConfig.core.i18n.defaultLocale)
        )
      }

      return TransactionService.register(
        frameworkConfig.core.i18n.defaultLocale,
        parsedMsg,
        company._id
      ).catch(errorHandler)

      function errorHandler(err) {
        err.context = err.context || {}
        err.context.registerTransactionParsedMsg = JSON.stringify(parsedMsg)
        throw new RegisterTransactionTaskError(
          frameworkConfig.core.i18n.defaultLocale,
          err
        )
      }
    }
  }
}
