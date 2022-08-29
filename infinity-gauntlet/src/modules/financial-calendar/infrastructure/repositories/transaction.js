import Transaction from 'application/core/models/transaction'
import { BaseRepository } from 'modules/common/infrastructure/repositories/base-repository'

export default class TransactionRepository extends BaseRepository(
  Transaction
) {}
