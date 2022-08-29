import Company from 'application/core/models/company'
import { BaseRepository } from 'modules/common/infrastructure/repositories/base-repository'
import InvalidParameterError from 'framework/core/errors/invalid-parameter-error'

class CompanyRepository extends BaseRepository(Company) {
  findByIds(ids = []) {
    if (!Array.isArray(ids)) throw new InvalidParameterError('pt-br', 'ids')

    return super.find({ _id: { $in: ids } })
  }
}

export default CompanyRepository
