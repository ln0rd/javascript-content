import createLogger from 'framework/core/adapters/logger'
import EventService from 'application/core/services/event'
import Transaction from 'application/core/models/transaction'

export const Logger = createLogger({ name: 'TRIGGER_EVENT_TRANSACTION_TASK' })

export default class TriggerEventTransaction {
  static type() {
    return 'manual'
  }

  static supportedEventNames() {
    return ['transaction-registered', 'transaction-canceled']
  }

  static isValid(args = []) {
    const [transactionId, eventSourceName] = args

    if (
      !transactionId ||
      !eventSourceName ||
      !this.supportedEventNames().includes(eventSourceName)
    ) {
      Logger.error(
        {
          transactionId,
          eventSourceName
        },
        'trigger-event-trx-args-error'
      )

      return false
    }

    return true
  }

  /**
   *
   * E.g.: 9212912,eventSourceName
   */
  static async handler(args = []) {
    if (!this.isValid(args)) return

    let [transactionId, eventSourceName] = args
    transactionId = parseInt(transactionId)

    const { company_id: companyId } = await this.getTransaction(transactionId)

    if (!companyId) return

    const context = {
      transactionId,
      eventSourceName,
      companyId
    }

    try {
      await EventService.triggerEvent(companyId, eventSourceName, {
        transactionId
      })
      Logger.info(context, 'trigger-event-trx-success')
    } catch (err) {
      context.err = err.message
      Logger.error(context, 'trigger-event-trx-error')
    }
  }

  static async getTransaction(transactionId) {
    try {
      const trx = await Transaction.findOne({ _id: transactionId })
        .select('company_id')
        .lean()
        .exec()

      return trx
    } catch (err) {
      Logger.error(
        { transactionId, err: err.message },
        'trigger-event-trx-not-found'
      )
    }

    return {}
  }
}
