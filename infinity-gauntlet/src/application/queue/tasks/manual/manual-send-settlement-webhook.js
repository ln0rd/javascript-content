/* eslint-disable no-await-in-loop */
import moment from 'moment-timezone'
import Company from 'application/core/models/company'
import Payable from 'application/core/models/payable'
import Settlement from 'application/core/models/settlement'
import sendWebHook from 'application/webhook/helpers/deliverer'

import { createLogger } from '@hashlab/logger'
import { settlementPayablesResponder } from 'application/core/responders/webhook/settlement-payables'

const Logger = createLogger({ name: 'MANUAL_SEND_SETTLEMENT_WEBHOOK' })
const BATCH_LIMIT = 100

export default class ManualSendSettlementWebhook {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    let settlementDate = moment().format('YYYY-MM-DD')
    if (args.length >= 1) {
      settlementDate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(args[0])
        ? args[0]
        : moment().format('YYYY-MM-DD')
    }

    const query = {
      date: settlementDate,
      status: 'settled'
    }
    let skip = 0
    let runAgain = true
    while (runAgain) {
      try {
        runAgain = await sendWebhookInBatch(BATCH_LIMIT, skip, query)
        skip = BATCH_LIMIT + skip
      } catch (err) {
        Logger.error(
          { err, BATCH_LIMIT, skip, query },
          'error-send-webhook-in-batch'
        )
        break
      }
    }
  }
}

async function sendWebhookInBatch(limit, skip, query) {
  Logger.info({ query, limit, skip }, 'fetching-settlements')

  const settlements = await Settlement.find(query)
    .limit(limit)
    .skip(skip)
    .sort({ created_at: 1 })
    .lean()

  if (settlements.length <= 0) {
    Logger.info({ query, limit, skip }, 'settlements-not-found')
    return false
  }

  Logger.info(
    { settlements: settlements.length, query, limit, skip },
    'settlements-found'
  )

  const companiesIds = settlements.map(({ company_id }) => company_id)

  const companies = await getCompanies(companiesIds)

  for (const settlement of settlements) {
    const company = companies.find(
      ({ _id }) => _id.toString() === settlement.company_id.toString()
    )
    const targetId =
      'parent_id' in company ? company.parent_id : settlement.company_id
    await sendSettlementWebhook(settlement, targetId)
  }
  return true
}

function getCompanies(companiesIds) {
  return Company.find({
    _id: { $in: companiesIds }
  })
    .lean()
    .select({ _id: 1, parent_id: 1 })
    .exec()
}

async function sendSettlementWebhook(settlement, targetId) {
  try {
    const settlementPayables = await getSettlementPayables(settlement._id)
    const payload = settlementPayablesResponder(settlementPayables, settlement)

    await sendWebHook(
      targetId,
      'settlement_created',
      'settlement',
      settlement._id.toString(),
      null,
      settlement.status,
      payload
    )
  } catch (err) {
    Logger.error(
      { settlement_id: settlement._id, err },
      'settlement-webhook-failed'
    )
  }
}

function getSettlementPayables(settlementId) {
  const payableSelect = {
    _id: 1,
    transaction_id: 1,
    payment_date: 1,
    original_payment_date: 1,
    status: 1
  }
  return Payable.find({
    settlement_id: settlementId
  })
    .lean()
    .select(payableSelect)
    .exec()
}
