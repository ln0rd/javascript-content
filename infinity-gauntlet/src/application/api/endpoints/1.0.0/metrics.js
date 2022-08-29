import Promise from 'bluebird'
import MetricsService from 'application/core/services/metrics'

export default class TransactionMetricsEndpoint {
  static get(req, res) {
    return Promise.resolve()
      .then(getMetrics)
      .then(respond)

    function getMetrics() {
      return MetricsService.getMetricsForDateRange(
        req.get('company').id,
        req.query
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static children(req, res) {
    const user = req.get('user')

    return Promise.resolve()
      .then(getChildrenMetrics)
      .then(respond)

    function getChildrenMetrics() {
      return MetricsService.getChildrenMetricsForDateRange(
        req.get('company').id,
        req.query,
        req.get('locale'),
        user && user.id ? user.id : ''
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static async balance(req, res) {
    const response = await MetricsService.balance(
      req.get('locale'),
      req.get('company').id
    )

    return res.json(200, response)
  }

  static async summary(req, res) {
    const response = await MetricsService.summary(
      req.get('locale'),
      req.query,
      req.get('company').id
    )

    return res.json(200, response)
  }

  static async toReceiveNextThirtyDays(req, res) {
    const response = await MetricsService.getPayablesToReceiveNextThirtyDays(
      req.get('company').id,
      req.query
    )

    return res.json(200, response)
  }
}
