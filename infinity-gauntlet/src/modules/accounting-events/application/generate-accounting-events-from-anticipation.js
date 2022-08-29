import moment from 'moment-timezone'
import mongoose from 'mongoose'
import getUniqueId from 'application/core/helpers/unique-id'
import createLogger from 'framework/core/adapters/logger'
import AccountingEvent from 'application/core/models/accounting-event'

import Anticipation from 'application/core/models/anticipation'
import Payable from 'application/core/models/payable'

const { ObjectId } = mongoose.Types

import { generateAnticipationEvents } from 'modules/accounting-events/domain/generate-anticipation-events'

const Logger = createLogger({ name: 'ACCOUNTING_EVENTS' })

export async function generateAccountingEventsFromAnticipation(anticipationId) {
  const executionId = getUniqueId()
  const executionStartedAt = moment()
    .tz('America/Sao_Paulo')
    .format()
  const logContext = { anticipationId, executionId, executionStartedAt }
  const Log = Logger.child(logContext)

  const anticipation = await getAnticipationById(anticipationId)

  if (!anticipation) {
    Log.error({ anticipationId }, 'no-anticipation-to-notify')
    throw new Error(
      `Cannot find anticipation #${anticipationId} to generate Accounting Events from.`
    )
  }

  const paymentDate = anticipation.anticipate_to
  const anticipatingCompany = anticipation.anticipating_company.toString()
  const isoId = anticipation.parent_company
    ? anticipation.parent_company.toString()
    : anticipatingCompany

  const anticipatedPayables = await getAnticipationPayables(
    anticipationId,
    paymentDate,
    anticipatingCompany
  )
  if (anticipatedPayables.length === 0) {
    Log.error(
      { paymentDate, anticipatingCompany, isoId },
      'cannot-find-payables-for-anticipation-to-notify'
    )
    throw new Error(
      `Cannot find payables for anticipation #${anticipationId} to generate Accounting Events from.`
    )
  }
  const accountingEvents = generateAnticipationEvents({
    isoId,
    anticipatingCompany,
    anticipationId,
    anticipationUpdateAt: anticipation.updated_at,
    anticipatedPayables
  })

  let insertedEvents
  try {
    insertedEvents = await AccountingEvent.insertMany(accountingEvents)
  } catch (err) {
    Log.error(
      { err, accountingEvents },
      'failed-to-batch-insert-accounting-events'
    )
    throw err
  }
  Log.info(
    { insertedEvents },
    'successfully-inserted-anticipation-accounting-events'
  )
}

function getAnticipationById(anticipationId) {
  return Anticipation.findOne({
    _id: anticipationId
  })
    .select({
      _id: 1,
      anticipating_company: 1,
      parent_company: 1,
      anticipate_to: 1,
      update_at: 1
    })
    .lean()
}

function getAnticipationPayables(
  anticipationId,
  paymentDate,
  anticipatingCompany
) {
  return Payable.find({
    payment_date: paymentDate,
    company_id: anticipatingCompany,
    anticipation: ObjectId(anticipationId)
  })
    .select({
      amount: 1,
      company_id: 1,
      fee: 1,
      mdr_fee: 1,
      anticipation_fee: 1,
      anticipation_cost: 1,
      anticipation_amount: 1
    })
    .lean()
}
