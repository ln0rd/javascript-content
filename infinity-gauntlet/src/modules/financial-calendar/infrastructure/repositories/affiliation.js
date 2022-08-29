import Affiliation from 'application/core/models/affiliation'
import { BaseRepository } from 'modules/common/infrastructure/repositories/base-repository'

export default class AffiliationRepository extends BaseRepository(Affiliation) {
  findByCompanyIdAndProvider(companyId, provider, options = {}) {
    return super.findOne(
      {
        company_id: companyId,
        provider
      },
      options
    )
  }
}
