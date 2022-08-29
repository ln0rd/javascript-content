import moment from 'moment'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import Dispute from 'application/core/models/dispute'
import { paginate } from 'application/core/helpers/pagination'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { disputeResponder } from 'application/core/responders/dispute'
import mongoose from 'mongoose'

const Logger = createLogger({
  name: 'DISPUTE_SERVICE'
})

export default class DisputeService {
  static async getDisputes(locale, params, companyId) {
    const Operation = 'getDisputes'

    const query = DisputeService.formatQuery(params, companyId)

    try {
      const dispute = await paginate(
        locale,
        Dispute,
        query,
        {
          created_at: -1
        },
        params.page,
        params.count,
        disputeResponder,
        null,
        'aggregate'
      )
      return dispute
    } catch (err) {
      Logger.error(
        { err, operation: Operation, params, company_id: companyId },
        'getDisputes failed'
      )
      throw err
    }
  }

  static formatQuery(params, companyId) {
    const Query = {
      'transaction.company_id': companyId
    }

    if (params.start_date || params.end_date) {
      Query.created_at = {}

      if (params.start_date) {
        Query.created_at.$gte = moment(params.start_date).format('YYYY-MM-DD')
      }

      if (params.end_date) {
        Query.created_at.$lt = moment(params.end_date)
          .add(1, 'd')
          .format('YYYY-MM-DD')
      }
    }

    return [
      {
        $lookup: {
          from: 'transactions',
          localField: 'transaction_id',
          foreignField: '_id',
          as: 'transaction'
        }
      },
      { $match: Query },
      { $project: { transaction: 0 } }
    ]
  }

  static async getDispute(locale, disputeId, companyId) {
    const Operation = 'getDispute'
    try {
      const dispute = await Dispute.findOne({
        _id: mongoose.Types.ObjectId(disputeId)
      })
        .lean()
        .exec()

      if (!dispute) {
        throw new ModelNotFoundError(
          locale,
          translate('models.dispute', locale)
        )
      }
      return disputeResponder(dispute)
    } catch (err) {
      Logger.error(
        {
          err,
          operation: Operation,
          params: { dispute_id: disputeId },
          company_id: companyId
        },
        'getDispute failed'
      )
      throw err
    }
  }
}
