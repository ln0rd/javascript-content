export default class PeriodicExecutePayouts {
  static type() {
    return 'periodic'
  }

  static expression() {
    return '45 7 * * 1-5'
  }

  static handler() {
    // return ManualExecutePayouts.handler()
    return
  }
}
