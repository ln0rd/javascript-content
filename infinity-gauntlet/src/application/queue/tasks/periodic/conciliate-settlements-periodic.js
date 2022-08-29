import RunSettlementsConciliation from 'application/queue/tasks/manual/run-settlements-conciliation'

export default class ConciliateSettlementsPeriodic {
  static type() {
    return 'periodic'
  }

  static expression() {
    return '0 0 17 * * *'
  }

  static handler() {
    return RunSettlementsConciliation.handler()
  }
}
