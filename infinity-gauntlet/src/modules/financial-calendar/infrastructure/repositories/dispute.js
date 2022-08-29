import Dispute from 'application/core/models/dispute'
import { BaseRepository } from 'modules/common/infrastructure/repositories/base-repository'

class DisputeRepository extends BaseRepository(Dispute) {}

export default DisputeRepository
