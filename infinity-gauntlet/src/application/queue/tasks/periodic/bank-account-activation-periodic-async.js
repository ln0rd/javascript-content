import BankAccountActivationAsync from 'application/queue/tasks/manual/bank-account-activation-async'

export default class BankAccountActivationPeriodic {
  static type() {
    return 'periodic'
  }

  static expression() {
    return '*/5 * * * *'
  }

  static handler() {
    return BankAccountActivationAsync.handler()
  }
}
