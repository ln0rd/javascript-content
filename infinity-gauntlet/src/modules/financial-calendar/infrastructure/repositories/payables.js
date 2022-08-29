import Payable from 'application/core/models/payable'
import { BaseRepository } from 'modules/common/infrastructure/repositories/base-repository'

class PayableRepository extends BaseRepository(Payable) {
  /**
   * Find Payables using the related Transaction ID.
   *
   * @param {String} id The transactionId
   * @param {*} otherParams Optional additional query parameters
   */
  findByTransactionId(transactionId, otherParams = {}) {
    const params = Object.assign(
      {},
      { transaction_id: transactionId },
      otherParams
    )

    return super.find(params)
  }
}

export default PayableRepository
