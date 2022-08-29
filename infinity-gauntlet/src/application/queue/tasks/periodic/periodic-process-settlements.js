export default class PeriodicExample {
  static type() {
    return 'periodic'
  }

  static expression() {
    return '0 6 * * 1-5'
  }

  static async handler() {
    return
  }
}
