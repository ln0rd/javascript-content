import { createWalletClient } from '@hashlab/wallet-client'
import config from 'application/core/config'
import { createId } from 'application/core/domain/breadcrumbs'
import Payout from 'application/core/models/payout'
import { manualExecutePayoutAsync } from 'application/queue/tasks/manual/manual-execute-payout-async'
import createLogger from 'framework/core/adapters/logger'
import cuid from 'cuid'

const taskName = 'MANUAL_PAYOUT_PENDING_FIX'
const Logger = createLogger({ name: taskName })

let successPayout = []
let failedPayout = []

export default class ManualPayoutPendingFix {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    const date = args[0]
    const hashProviderId = '5b9fadf115f0500008298538'

    Logger.info({}, 'looking-for-payouts')
    const payouts = await Payout.find({
      date,
      reason: 'normal_payment',
      status: 'pending'
    })
      .lean()
      .exec()

    const payoutsIds = payouts.map(p => p._id)
    Logger.info({ payoutsIds }, 'payout-ids')

    const walletClient = await createWalletClient(
      config.services.wallet_endpoint
    )

    /* eslint-disable no-await-in-loop */
    for (const payout of payouts) {
      try {
        Logger.info({ payoutId: payout._id }, 'fixing-payout')

        await Payout.updateOne(
          {
            _id: payout._id
          },
          {
            $set: {
              status: 'failed'
            }
          }
        )

        Logger.info(
          { payoutId: payout._id, walletId: payout.source_id },
          'fixing-payout-unfreeze-money'
        )
        await walletClient.unfreezeWalletAmount(payout.source_id, {
          frozenAmountId: payout.frozen_amount_id,
          takeAmountAtomically: false,
          requestId: createId({
            uid: cuid(),
            source: taskName,
            payout: payout._id
          })
        })

        Logger.info(
          { payoutId: payout._id, companyId: payout.company_id },
          'fixing-payout-execute-payout'
        )
        await manualExecutePayoutAsync(payout.company_id, hashProviderId, false)

        successPayout.push(payout._id)
      } catch (err) {
        err.context = {
          payoutId: payout._id
        }

        failedPayout.push(payout._id)

        Logger.err({ err }, 'manual-fix-payout')
        throw err
      }
    }
    /* eslint-enable no-await-in-loop */

    Logger.info({ successPayout, failedPayout }, 'executed-payouts')
  }
}
