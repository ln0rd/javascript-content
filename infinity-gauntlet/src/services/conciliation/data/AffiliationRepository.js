const CommonActions = require('./CommonActions')
const Affiliation = require('application/core/models/affiliation').default

/**
 * @type {module.AffiliationRepository}
 */
module.exports = class AffiliationRepository extends CommonActions {
  constructor() {
    super(Affiliation)
  }
}
