import Company from 'application/core/models/company'
import Payout, {
  reasons as PayoutReason,
  status as PayoutStatus
} from 'application/core/models/payout'
import createLogger from 'framework/core/adapters/logger'
import moment from 'moment'
import sendWebHook from 'application/webhook/helpers/deliverer'
import { companyResponder } from 'application/core/responders/company'
import ManualValidationPayout from 'application/queue/tasks/manual/manual-validation-payout'

const taskName = 'BANK_ACCOUNT_ACTIVATION_ASYNC'
const Logger = createLogger({ name: taskName })

const payoutsInMinutes = 60

const retryableErrors = [
  'origin bank account does not have enough limit',
  'settlement of the transaction failed',
  'provider internal error',
  'receiver bank is unavailable'
]

const findValidationPayouts = async () => {
  const filter = {
    reason: PayoutReason.bankAccountValidation,
    status: { $in: [PayoutStatus.paid, PayoutStatus.failed] },
    updated_at: {
      $gte: moment()
        .subtract(payoutsInMinutes, 'minutes')
        .toDate()
    }
  }

  Logger.info({ filter }, 'finding-payouts')

  return Payout.aggregate([
    { $match: filter },
    { $group: { _id: '$company_id', status: { $last: '$status' } } }
  ])
}

export default class BankAccountActivationAsync {
  static type() {
    return 'manual'
  }

  static async handler() {
    Logger.info({}, 'bank-account-activation-async-start')

    const payouts = await findValidationPayouts()
    const payoutsPaid = payouts.filter(p => p.status === PayoutStatus.paid)
    const payoutsFailed = payouts.filter(p => p.status === PayoutStatus.failed)

    Logger.info({}, 'updating-companies')

    if (payoutsPaid.length > 0) {
      /* eslint-disable no-await-in-loop */
      for (const { _id: companyId } of payoutsPaid) {
        const company = await Company.findOneAndUpdate(
          {
            _id: companyId,
            'bank_account.status': { $ne: 'valid' }
          },
          {
            $set: { 'bank_account.status': 'valid', updated_at: new Date() }
          },
          { new: true }
        )

        try {
          if (company) {
            Logger.info({ companyId }, 'status-updated')

            await sendWebHook(
              company.parent_id || company._id,
              'bank_account_accepted',
              'company',
              company._id,
              'pending',
              company.bank_account.status,
              companyResponder(company)
            )

            Logger.info({ companyId }, 'webhook-sent')
          }
        } catch (error) {
          Logger.warn({ companyId }, 'webhook-failed')
        }
      }
      /* eslint-enable no-await-in-loop */
    } else {
      Logger.info({}, 'valid-update-no-payouts-found')
    }

    if (payoutsFailed.length > 0) {
      /* eslint-disable no-await-in-loop */
      for (const {
        _id: companyId,
        status_message: statusMessage
      } of payoutsFailed) {
        if (retryableErrors.includes(statusMessage)) {
          Logger.info({ companyId }, 'retry-payout-failed')
          await ManualValidationPayout.handler([companyId])
          return
        }

        const company = await Company.findOneAndUpdate(
          {
            _id: companyId,
            'bank_account.status': { $ne: 'invalid' }
          },
          {
            $set: { 'bank_account.status': 'invalid', updated_at: new Date() }
          },
          { new: true }
        )

        try {
          if (company) {
            Logger.info({ companyId }, 'status-updated')

            await sendWebHook(
              company.parent_id || company._id,
              'bank_account_rejected',
              'company',
              company._id,
              'pending',
              company.bank_account.status,
              companyResponder(company)
            )

            Logger.info({ companyId }, 'webhook-sent')
          }
        } catch (error) {
          Logger.warn({ companyId }, 'webhook-failed')
        }
      }
      /* eslint-enable no-await-in-loop */
    } else {
      Logger.info({}, 'failed-update-no-payouts-found')
    }

    Logger.info({}, 'automatic-payouts-success')
  }
}
