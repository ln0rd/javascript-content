import { migrateMerchant } from 'application/queue/tasks/manual/manual-migrate-mobbi-merchants'

export default class MigrateEndpoint {
  static async mobbi(req, res) {
    const params = req.body

    if (!params.company_id) {
      return res.json(400, {
        success: false,
        error: 'Missing company_id param.'
      })
    }

    const result = { success: true, error: null }
    try {
      await migrateMerchant(params.company_id)
    } catch (err) {
      result.success = false
      result.error = err.toString()
    }

    return res.json(result.success ? 201 : 500, result)
  }
}
