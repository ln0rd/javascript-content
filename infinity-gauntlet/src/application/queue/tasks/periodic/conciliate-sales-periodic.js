import RunSalesConciliation from 'application/queue/tasks/manual/run-sales-conciliation'

export default class ConciliateSalesPeriodic {
  static type() {
    return 'periodic'
  }

  /**
   * This cron expression should be guaranteed that this task will run after the following tasks which update some payables values:
   *  FixLeoTransactionAnticipationFees -  every 3am - src/application/queue/tasks/periodic/periodic-fix-leo-transaction-anticipation-fees.js
   *  RemoveDuplicatedTransactions - every 4am - src/application/queue/tasks/periodic/periodic-remove-duplicate-transactions.js
   *  ResetLojaLeoAnticipationPaymentDate - every 3h30am - src/application/queue/tasks/periodic/periodic-reset-loja-leo-anticipation-payment-date.js
   */
  static expression() {
    return '30 4 * * *'
  }

  static handler() {
    return RunSalesConciliation.handler()
  }
}
