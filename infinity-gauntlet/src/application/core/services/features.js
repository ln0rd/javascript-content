import Promise from 'bluebird'
import Company from 'application/core/models/company'

export default class FeaturesService {
  static isEnabled(companyId, featureName) {
    return Promise.resolve(
      Company.findById(companyId, 'enabled_features')
        .lean()
        .exec()
    )
      .tap(throwIfCompanyDoesNotExists)
      .then(
        company =>
          company.enabled_features &&
          Boolean(company.enabled_features[featureName])
      )

    function throwIfCompanyDoesNotExists(company) {
      if (!company) {
        let err = new Error(`Company not found for id=${companyId}`)
        err.name = 'CompanyNotFound'
        throw err
      }
    }
  }
}
