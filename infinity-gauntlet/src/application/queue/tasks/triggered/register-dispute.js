import createLogger from 'framework/core/adapters/logger'
import DisputeHandlingService from 'modules/financial-calendar/application/services/dispute-handling'
import DisputeRepository from 'modules/financial-calendar/infrastructure/repositories/dispute'
import TransactionRepository from 'modules/financial-calendar/infrastructure/repositories/transaction'

import InvalidParameterError from 'framework/core/errors/invalid-parameter-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'

const Logger = createLogger({ name: 'REGISTER_DISPUTE_TASK' })

export default class RegisterDispute {
  static type() {
    return 'triggered'
  }

  static async handler(rawMsg) {
    const trxRepo = new TransactionRepository()
    const repo = new DisputeRepository()

    let { transaction_id, provider_transaction_id } = JSON.parse(rawMsg)

    if (!transaction_id) {
      if (!provider_transaction_id) {
        Logger.error({ body: JSON.parse(rawMsg) }, 'no-ids-to-start-dispute')

        throw new InvalidParameterError(
          'No TransactionID or ProviderTransactionID parameters passed to worker.'
        )
      }

      let transaction
      try {
        transaction = await trxRepo.findOne(
          { provider_transaction_id },
          { _id: 1 }
        )
      } catch (err) {
        Logger.error(
          { err, provider_transaction_id },
          'failed-to-match-provider-id-with-trx'
        )

        throw err
      }

      if (!transaction) {
        Logger.error({ provider_transaction_id }, 'no-transaction-found')
        throw new ModelNotFoundError('pt-br', 'transaction')
      }

      transaction_id = transaction._id
    }

    Logger.info({ transaction_id }, 'starting-dispute-registration')

    const existingDispute = await repo.findOne({ transaction_id })

    /*
     * As of 17/06/20, since we don't have 2nd cycle chargeback treament
     * we can just assume that if a dispute already exists, it was treated
     * as a chargeback and corresponding payables were created. Thus, we
     * must skip so we don't handle it repeatedly.
     */
    if (existingDispute) {
      Logger.warn(
        { transaction_id, dispute_id: existingDispute._id },
        'skipping-already-existing-dispute'
      )

      return
    }

    const dispute = await repo.create({ transaction_id })

    Logger.info({ dispute }, 'successfully-created-new-dispute')

    const service = new DisputeHandlingService()

    try {
      await service.handle(dispute)
    } catch (err) {
      Logger.error(
        { err, transactionId: transaction_id },
        'failed-to-register-dispute'
      )
      return
    }

    Logger.info(
      { transactionId: transaction_id },
      'registered-dispute-successfully'
    )
  }
}
