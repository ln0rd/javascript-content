import ManualResetLojaLeoAnticipationPaymentDate from 'application/queue/tasks/manual/manual-reset-loja-leo-anticipation-payment-date'

export default class PeriodicResetLojaLeoAnticipationPaymentDate {
  static type() {
    return 'periodic'
  }

  static expression() {
    // Run every day at 3:30am
    return '30 3 * * *'
  }

  static handler() {
    return ManualResetLojaLeoAnticipationPaymentDate.handler()
  }
}
