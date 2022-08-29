import ManualFixLeoTransactionAnticipationFees from 'application/queue/tasks/manual/manual-fix-leo-transaction-anticipation-fees'

export default class PeriodicFixLeoTransactionAnticipationFees {
  static type() {
    return 'periodic'
  }

  static expression() {
    // Run every day at 3am
    return '0 3 * * *'
  }

  static handler() {
    return ManualFixLeoTransactionAnticipationFees.handler()
  }
}
