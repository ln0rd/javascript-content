import mongoose from 'mongoose'
import { BaseRepository } from 'modules/common/infrastructure/repositories/base-repository'
import OperatingDebt, {
  STATUS_PENDING,
  STATUS_PAID
} from 'application/core/models/operating-debt'
import moment from 'moment'

const { Types } = mongoose
const { ObjectId } = Types

export default class OperatingDebtRepository extends BaseRepository(
  OperatingDebt
) {
  async registerNewDebt(payload) {
    const debtAlreadyExists = await this.findOne({
      model: payload.model,
      model_id: payload.modelId
    })
    if (debtAlreadyExists) {
      return debtAlreadyExists
    }
    return super.create({
      company_id: payload.companyId,
      status: STATUS_PENDING,
      debt_amount: payload.amount,
      paid_amount: 0,
      model: payload.model,
      model_id: payload.modelId,
      type: payload.debtType,
      payment_history: []
    })
  }

  getOutstandingDebtsByCompanyId(companyId) {
    return super.find(
      {
        company_id: ObjectId(companyId),
        status: STATUS_PENDING
      },
      '_id debt_amount paid_amount',
      {
        sort: {
          created_at: 1
        }
      }
    )
  }

  updateSettlementPaymentHistory(
    settlementId,
    operatingDebtId,
    paidAmount,
    usedAmount,
    payOff,
    paymentsByBrand
  ) {
    return super.updateOne(
      { _id: ObjectId(operatingDebtId) },
      {
        $set: {
          status: payOff ? STATUS_PAID : STATUS_PENDING,
          paid_amount: paidAmount,
          updated_at: moment().toDate()
        },
        $addToSet: {
          payment_history: {
            used_amount: usedAmount,
            model: 'settlement',
            model_id: settlementId,
            description: 'positive settlement',
            payment_date: moment().format('YYYY-MM-DD'),
            payments_by_brand: paymentsByBrand
          }
        }
      }
    )
  }
}
