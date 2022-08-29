import moment from 'moment'
import mongoose from 'mongoose'
import Settlement from 'application/core/models/settlement'
import { BaseRepository } from 'modules/common/infrastructure/repositories/base-repository'

export default class SettlementRepository extends BaseRepository(Settlement) {
  registerOperatingDebt(
    settlementId,
    operatingDebtId,
    operatingDebtAmount,
    settledAmount
  ) {
    return super.updateByIds([settlementId], {
      $set: {
        operating_debt_created: {
          debt_id: mongoose.Types.ObjectId(operatingDebtId),
          debt_amount: operatingDebtAmount
        },
        status: 'settled',
        settled_amount: settledAmount,
        updated_at: moment().toDate()
      }
    })
  }

  getProcessingNegativeSettlements(date) {
    return super.find(
      {
        date,
        status: { $ne: 'settled' },
        amount: { $lt: 0 }
      },
      '_id company_id amount'
    )
  }

  updateOperatingDebtsPaymentHistory(
    settlementId,
    operatingDebtId,
    usedAmount,
    settledAmount,
    newBrands,
    payOff,
    paymentsByBrand
  ) {
    return super.updateOne(
      { _id: settlementId },
      {
        $set: {
          settled_amount: settledAmount,
          status: payOff ? 'settled' : 'processing',
          brands: newBrands,
          updated_at: moment().toDate()
        },
        $addToSet: {
          paid_operating_debts: {
            debt_id: mongoose.Types.ObjectId(operatingDebtId),
            paid_amount: usedAmount,
            payments_by_brand: paymentsByBrand
          }
        }
      }
    )
  }
}
